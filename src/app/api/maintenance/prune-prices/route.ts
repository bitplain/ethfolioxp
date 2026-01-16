import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getAdminGuard } from "@/lib/adminGuard";
import { prisma } from "@/lib/db";
import { buildPricePruneWhere } from "@/lib/cleanup";

export async function POST() {
  const session = await getServerSession(authOptions);
  const guard = getAdminGuard(session);
  if (guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const cutoff = Math.floor(Date.now() / 1000) - 365 * 24 * 3600;
  const result = await prisma.priceSnapshot.deleteMany({
    where: buildPricePruneWhere(cutoff),
  });

  return NextResponse.json({ ok: true, deleted: result.count });
}
