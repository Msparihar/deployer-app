import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Base path for static sites (mounted volume in Docker)
const STATIC_SITES_PATH = process.env.STATIC_SITES_PATH || "/var/www/static-sites";
// Path to Traefik dynamic config
const TRAEFIK_CONFIG_PATH = process.env.TRAEFIK_CONFIG_PATH || "/etc/dokploy/traefik/dynamic";

// Generate Traefik config for all deployed sites with individual routers per site
async function updateTraefikConfig() {
  const baseDomain = process.env.SITES_DOMAIN || "sites.manishsingh.tech";

  console.log("[Traefik] Starting config update...");
  console.log("[Traefik] Config path:", TRAEFIK_CONFIG_PATH);

  // Get all deployments from database
  const deployments = await prisma.deployment.findMany({
    select: { appName: true }
  });

  console.log("[Traefik] Found deployments:", deployments.length);

  if (deployments.length === 0) {
    console.log("[Traefik] No deployments found, skipping config update");
    return;
  }

  // Generate individual routers for each site (required for per-site SSL certificates)
  const routers: string[] = [];

  for (const deployment of deployments) {
    const { appName } = deployment;
    const domain = `${appName}.${baseDomain}`;
    const safeName = appName.replace(/[^a-z0-9-]/g, "-");

    routers.push(`    static-sites-${safeName}:
      rule: 'Host(\`${domain}\`)'
      service: static-sites-service
      middlewares:
        - redirect-to-https
      entryPoints:
        - web
      priority: 100
    static-sites-${safeName}-websecure:
      rule: 'Host(\`${domain}\`)'
      service: static-sites-service
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt
        domains:
          - main: '${domain}'
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

  // Validate file type
  if (!file.name.endsWith(".html")) {
    return NextResponse.json({ error: "Only HTML files are allowed" }, { status: 400 });
  }

  // Validate file size (10MB max)
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File size must be less than 10MB" }, { status: 400 });
  }

  const userId = session.user.id;
  const appName = `site-${userId.slice(0, 6)}-${randomUUID().slice(0, 6)}`;

  try {
    // Create directory for the site
    const sitePath = `${STATIC_SITES_PATH}/${appName}`;
    await fs.mkdir(sitePath, { recursive: true });

    // Save HTML file as index.html
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(`${sitePath}/index.html`, buffer);

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

