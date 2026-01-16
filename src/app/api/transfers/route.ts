import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decodeCursor, encodeCursor } from "@/lib/pagination";
import { getTransferLimit } from "@/lib/transferPagination";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = getTransferLimit(url.searchParams);
  const cursor = decodeCursor(url.searchParams.get("cursor"));

  const where = cursor
    ? {
        userId: session.user.id,
        OR: [
          { blockTime: { lt: new Date(cursor.ts) } },
          { blockTime: new Date(cursor.ts), id: { lt: cursor.id } },
        ],
      }
    : { userId: session.user.id };

  const transfers = await prisma.transfer.findMany({
    where,
    include: { token: true },
    orderBy: [{ blockTime: "desc" }, { id: "desc" }],
    take: limit,
  });

  const next = transfers[transfers.length - 1];
  const nextCursor = next
    ? encodeCursor({ id: next.id, ts: next.blockTime.getTime() })
    : null;

  return NextResponse.json({ ok: true, transfers, nextCursor });
}
