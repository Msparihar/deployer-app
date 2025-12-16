import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import fs from "fs/promises";
import path from "path";
import { exec } from "child-process-promise";
import { randomUUID } from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

  // Create temp directory
  const tempDir = path.join(process.cwd(), "temp", appName);

  try {
    await fs.mkdir(tempDir, { recursive: true });

    // Save HTML file as index.html
    const buffer = Buffer.from(await file.arrayBuffer());
    const localFilePath = path.join(tempDir, "index.html");
    await fs.writeFile(localFilePath, buffer);

    // SSH configuration
    const sshHost = process.env.SSH_HOST || "72.60.96.109";
    const sshUser = process.env.SSH_USER || "root";
    const sshKeyPath = process.env.SSH_KEY_PATH || "~/.ssh/hostinger";
    const remotePath = `/var/www/static-sites/${appName}`;

    // Create remote directory and upload file via SSH/SCP
    await exec(
      `ssh -i ${sshKeyPath} -o StrictHostKeyChecking=no ${sshUser}@${sshHost} "mkdir -p ${remotePath}"`
    );
    await exec(
      `scp -i ${sshKeyPath} -o StrictHostKeyChecking=no "${localFilePath}" ${sshUser}@${sshHost}:${remotePath}/index.html`
    );

    // Generate deployed URL
    const deployedUrl = `https://${appName}.sites.manishsingh.tech`;

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

  } finally {
    // Cleanup temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error("Failed to cleanup temp directory:", cleanupError);
    }
  }
}

