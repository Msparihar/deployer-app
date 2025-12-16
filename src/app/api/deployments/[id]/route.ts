import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import fs from "fs/promises";
import { updateTraefikConfig } from "../../deploy/route";
import { prisma } from "@/lib/prisma";

const STATIC_SITES_PATH = process.env.STATIC_SITES_PATH || "/var/www/static-sites";

// PATCH - Pause or Resume a deployment
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { action } = body;

    if (action !== "pause" && action !== "resume") {
      return NextResponse.json(
        { error: "Invalid action. Use 'pause' or 'resume'" },
        { status: 400 }
      );
    }

    // Find deployment and verify ownership
    const deployment = await prisma.deployment.findUnique({
      where: { id },
    });

    if (!deployment) {
      return NextResponse.json({ error: "Deployment not found" }, { status: 404 });
    }

    if (deployment.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Update status
    const newStatus = action === "pause" ? "PAUSED" : "ACTIVE";
    const updatedDeployment = await prisma.deployment.update({
      where: { id },
      data: { status: newStatus },
    });

    // Regenerate Traefik config
    try {
      await updateTraefikConfig();
      console.log(`[Deployment] ${action}d ${deployment.appName}`);
    } catch (traefikError) {
      console.error("[Deployment] Failed to update Traefik config:", traefikError);
    }

    return NextResponse.json(updatedDeployment);
  } catch (error) {
    console.error("Error updating deployment:", error);
    return NextResponse.json({ error: "Failed to update deployment" }, { status: 500 });
  }
}

// DELETE - Remove a deployment permanently
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Find deployment and verify ownership
    const deployment = await prisma.deployment.findUnique({
      where: { id },
    });

    if (!deployment) {
      return NextResponse.json({ error: "Deployment not found" }, { status: 404 });
    }

    if (deployment.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Delete from database first
    await prisma.deployment.delete({
      where: { id },
    });

    // Try to remove site files
    const sitePath = `${STATIC_SITES_PATH}/${deployment.appName}`;
    try {
      await fs.rm(sitePath, { recursive: true, force: true });
      console.log(`[Deployment] Removed files for ${deployment.appName}`);
    } catch (fsError) {
      console.error(`[Deployment] Failed to remove files for ${deployment.appName}:`, fsError);
      // Continue even if file removal fails - database record is already deleted
    }

    // Regenerate Traefik config
    try {
      await updateTraefikConfig();
      console.log(`[Deployment] Traefik config updated after deleting ${deployment.appName}`);
    } catch (traefikError) {
      console.error("[Deployment] Failed to update Traefik config:", traefikError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting deployment:", error);
    return NextResponse.json({ error: "Failed to delete deployment" }, { status: 500 });
  }
}
