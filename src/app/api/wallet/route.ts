import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

function normalizeAddress(address: string) {
  return address.trim().toLowerCase();
}

function isValidAddress(address: string) {
  return /^0x[a-f0-9]{40}$/.test(address);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const address = normalizeAddress(String(body?.address || ""));

    if (!isValidAddress(address)) {
      return NextResponse.json({ error: "Invalid address." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found. Please sign in again." },
        { status: 401 }
      );
    }

    const other = await prisma.wallet.findUnique({ where: { address } });
    if (other && other.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Address is already linked to another user." },
        { status: 409 }
      );
    }

    const existing = await prisma.wallet.findFirst({
      where: { userId: session.user.id },
    });

    if (existing) {
      await prisma.wallet.update({
        where: { id: existing.id },
        data: { address },
      });
    } else {
      await prisma.wallet.create({
        data: { address, userId: session.user.id },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const isDbUnavailable =
      error instanceof Error &&
      error.message.includes("Can't reach database server");

    return NextResponse.json(
      {
        error: isDbUnavailable
          ? "Database is unavailable. Start Postgres and try again."
          : "Wallet save failed.",
      },
      { status: isDbUnavailable ? 503 : 500 }
    );
  }
}
