import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import fs from "fs/promises";
import { randomUUID } from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Base path for static sites (mounted volume in Docker)
const STATIC_SITES_PATH = process.env.STATIC_SITES_PATH || "/var/www/static-sites";

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

