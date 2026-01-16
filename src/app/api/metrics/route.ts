import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getAdminGuard } from "@/lib/adminGuard";
import { metrics } from "@/lib/metrics";

export async function GET() {
  const session = await getServerSession(authOptions);
  const guard = getAdminGuard(session);
  if (guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  return NextResponse.json({ ok: true, ...metrics.snapshot() });
}
