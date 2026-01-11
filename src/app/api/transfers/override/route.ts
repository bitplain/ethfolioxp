import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fetchUsdRubRate } from "@/lib/fx";

function parsePrice(input: unknown) {
  const value = String(input ?? "").trim();
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return new Prisma.Decimal(value);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const transferId = String(body?.transferId || "").trim();
    if (!transferId) {
      return NextResponse.json({ error: "Missing transfer id." }, { status: 400 });
    }

    const transfer = await prisma.transfer.findFirst({
      where: { id: transferId, userId: session.user.id },
    });

    if (!transfer) {
      return NextResponse.json({ error: "Transfer not found." }, { status: 404 });
    }

    let priceUsd = parsePrice(body?.priceUsd);
    let priceRub = parsePrice(body?.priceRub);

    if (!priceUsd && !priceRub) {
      return NextResponse.json(
        { error: "Provide USD or RUB price." },
        { status: 400 }
      );
    }

    if (!priceRub && priceUsd) {
      const fxRate = await fetchUsdRubRate(
        Math.floor(transfer.blockTime.getTime() / 1000)
      );
      if (fxRate) {
        priceRub = priceUsd.mul(fxRate);
      }
    }

    if (!priceUsd && priceRub) {
      const fxRate = await fetchUsdRubRate(
        Math.floor(transfer.blockTime.getTime() / 1000)
      );
      if (fxRate) {
        priceUsd = priceRub.div(fxRate);
      }
    }

    if (!priceUsd) {
      return NextResponse.json(
        { error: "Unable to determine USD price." },
        { status: 400 }
      );
    }

    const valueUsd = priceUsd ? priceUsd.mul(transfer.amount) : null;
    const valueRub = priceRub ? priceRub.mul(transfer.amount) : null;

    await prisma.transfer.update({
      where: { id: transfer.id },
      data: {
        priceUsd,
        valueUsd,
        priceRub,
        valueRub,
        priceManual: true,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const isDbUnavailable =
      error instanceof Error &&
      error.message.includes("Can't reach database server");

    return NextResponse.json(
      {
        error: isDbUnavailable
          ? "Database is unavailable. Start Postgres and try again."
          : "Price override failed.",
      },
      { status: isDbUnavailable ? 503 : 500 }
    );
  }
}
