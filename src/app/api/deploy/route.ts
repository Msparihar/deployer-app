import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import AdmZip from "adm-zip";
import { prisma } from "@/lib/prisma";

// Base path for static sites (mounted volume in Docker)
const STATIC_SITES_PATH = process.env.STATIC_SITES_PATH || "/var/www/static-sites";
// Path to Traefik dynamic config
const TRAEFIK_CONFIG_PATH = process.env.TRAEFIK_CONFIG_PATH || "/etc/dokploy/traefik/dynamic";

// Generate Traefik config for all deployed sites with individual routers per site
export async function updateTraefikConfig() {
  const baseDomain = process.env.SITES_DOMAIN || "sites.manishsingh.tech";

  console.log("[Traefik] Starting config update...");
  console.log("[Traefik] Config path:", TRAEFIK_CONFIG_PATH);

  // Get only ACTIVE deployments from database
  const deployments = await prisma.deployment.findMany({
    where: { status: "ACTIVE" },
    select: { appName: true }
  });

  console.log("[Traefik] Found active deployments:", deployments.length);

  if (deployments.length === 0) {
    console.log("[Traefik] No active deployments found, writing empty config");
    // Write empty config to remove all routes for paused sites
    const configPath = path.join(TRAEFIK_CONFIG_PATH, "static-sites.yml");
    await fs.writeFile(configPath, "# No active deployments\n");
    return;
  }

  // Generate individual routers for each site (required for per-site SSL certificates)
  const routers: string[] = [];

  for (const deployment of deployments) {
    const { appName } = deployment;
    const domain = `${appName}.${baseDomain}`;
    const safeName = appName.replace(/[^a-z0-9-]/g, "-");

    const bt = '`';
    routers.push(`    static-sites-${safeName}:
      rule: "Host(${bt}${domain}${bt})"
      service: static-sites-service
      middlewares:
        - redirect-to-https
      entryPoints:
        - web
      priority: 100
    static-sites-${safeName}-websecure:
      rule: "Host(${bt}${domain}${bt})"
      service: static-sites-service
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt
        domains:
          - main: "${domain}"
      priority: 100`);
  }

  const config = `http:
  routers:
${routers.join("\n")}
  services:
    static-sites-service:
      loadBalancer:
        servers:
          - url: http://10.0.0.1:8081
        passHostHeader: true
`;

  const configPath = path.join(TRAEFIK_CONFIG_PATH, "static-sites.yml");

  try {
    await fs.writeFile(configPath, config);
    console.log("[Traefik] Config written successfully to:", configPath);
  } catch (writeError) {
    console.error("[Traefik] Failed to write config file:", writeError);
    throw writeError;
  }
}

// Helper function to check if a path is safe (no directory traversal)
function isSafePath(entryPath: string): boolean {
  const normalized = path.normalize(entryPath);
  return !normalized.startsWith("..") && !path.isAbsolute(normalized);
}

// Helper function to skip unwanted files
function shouldSkipEntry(entryPath: string): boolean {
  const name = path.basename(entryPath);
  return (
    entryPath.startsWith("__MACOSX") ||
    name === ".DS_Store" ||
    name.startsWith("._")
  );
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("htmlFile") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const isHtml = file.name.endsWith(".html");
  const isZip = file.name.endsWith(".zip");

  // Validate file type
  if (!isHtml && !isZip) {
    return NextResponse.json({ error: "Only HTML or ZIP files are allowed" }, { status: 400 });
  }

  // Validate file size
  const maxSize = isZip ? 50 * 1024 * 1024 : 10 * 1024 * 1024; // 50MB for ZIP, 10MB for HTML
  if (file.size > maxSize) {
    return NextResponse.json({
      error: isZip ? "ZIP file must be less than 50MB" : "File size must be less than 10MB"
    }, { status: 400 });
  }

  const userId = session.user.id;
  const appName = `site-${userId.slice(0, 6)}-${randomUUID().slice(0, 6)}`;
  const sitePath = `${STATIC_SITES_PATH}/${appName}`;

  try {
    // Create directory for the site
    await fs.mkdir(sitePath, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());

    if (isHtml) {
      // Save HTML file as index.html
      await fs.writeFile(`${sitePath}/index.html`, buffer);
    } else {
      // Handle ZIP file
      let zip: AdmZip;
      try {
        zip = new AdmZip(buffer);
      } catch {
        await fs.rm(sitePath, { recursive: true, force: true });
        return NextResponse.json({ error: "Invalid or corrupted ZIP file" }, { status: 400 });
      }

      const entries = zip.getEntries();

      // Security checks
      if (entries.length > 1000) {
        await fs.rm(sitePath, { recursive: true, force: true });
        return NextResponse.json({ error: "ZIP contains too many files (max 1000)" }, { status: 400 });
      }

      let totalSize = 0;
      for (const entry of entries) {
        totalSize += entry.header.size;
        if (totalSize > 100 * 1024 * 1024) {
          await fs.rm(sitePath, { recursive: true, force: true });
          return NextResponse.json({ error: "Extracted content too large (max 100MB)" }, { status: 400 });
        }
      }

      // Extract files
      for (const entry of entries) {
        if (entry.isDirectory) continue;
        if (shouldSkipEntry(entry.entryName)) continue;
        if (!isSafePath(entry.entryName)) continue;

        const targetPath = path.join(sitePath, entry.entryName);
        const targetDir = path.dirname(targetPath);

        await fs.mkdir(targetDir, { recursive: true });
        await fs.writeFile(targetPath, entry.getData());
      }

      // Check for index.html at root
      let hasIndexHtml = false;
      try {
        await fs.access(`${sitePath}/index.html`);
        hasIndexHtml = true;
      } catch {
        // index.html not at root, check for single subdirectory
        const items = await fs.readdir(sitePath, { withFileTypes: true });
        const dirs = items.filter(item => item.isDirectory);

        if (dirs.length === 1) {
          const subDirPath = `${sitePath}/${dirs[0].name}`;
          try {
            await fs.access(`${subDirPath}/index.html`);
            // Move contents from subdirectory to root
            const subItems = await fs.readdir(subDirPath);
            for (const item of subItems) {
              await fs.rename(`${subDirPath}/${item}`, `${sitePath}/${item}`);
            }
            await fs.rmdir(subDirPath);
            hasIndexHtml = true;
          } catch {
            // No index.html in subdirectory either
          }
        }
      }

      if (!hasIndexHtml) {
        await fs.rm(sitePath, { recursive: true, force: true });
        return NextResponse.json({ error: "ZIP must contain an index.html file" }, { status: 400 });
      }
    }

    // Generate deployed URL
    const baseDomain = process.env.SITES_DOMAIN || "sites.manishsingh.tech";
    const deployedUrl = `https://${appName}.${baseDomain}`;

    // Store deployment in database
    await prisma.deployment.create({
      data: {
        userId: userId,
        appName: appName,
        url: deployedUrl,
      },
    });

    // Update Traefik config with the new site
    try {
      await updateTraefikConfig();
      console.log(`[Deploy] Traefik config updated for ${appName}`);
    } catch (traefikError) {
      console.error("[Deploy] Failed to update Traefik config:", traefikError);
      console.error("[Deploy] Error details:", traefikError instanceof Error ? traefikError.message : String(traefikError));
      // Don't fail the deployment if Traefik update fails - site files are deployed, just SSL may take time
    }

    return NextResponse.json({ url: deployedUrl });

  } catch (error) {
    console.error("Deployment error:", error);

    let errorMessage = "Deployment failed";
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}



