import { NextResponse } from "next/server";
import { metrics } from "@/lib/metrics";

export async function GET() {
  return NextResponse.json({ ok: true, ...metrics.snapshot() });
}
