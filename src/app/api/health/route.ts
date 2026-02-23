import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const start = Date.now();
  let dbLatency = -1;
  let dbStatus = "ok";

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbLatency = Date.now() - start;
  } catch {
    dbStatus = "unreachable";
  }

  const status = dbStatus === "ok" ? 200 : 503;

  return NextResponse.json(
    {
      status: dbStatus === "ok" ? "healthy" : "unhealthy",
      uptime: process.uptime(),
      db: {
        status: dbStatus,
        latency_ms: dbLatency,
      },
    },
    { status }
  );
}
