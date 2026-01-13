import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { log } from "@/lib/logger";
import { backfillMissingPrices } from "@/lib/sync";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await backfillMissingPrices(session.user.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    log("error", "backfill failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Backfill failed." },
      { status: 500 }
    );
  }
}
