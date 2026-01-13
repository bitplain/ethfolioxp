import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const checkDb = url.searchParams.get("db") === "1";

  if (checkDb) {
    await prisma.$queryRaw`SELECT 1`;
  }

  return NextResponse.json({ ok: true });
}
