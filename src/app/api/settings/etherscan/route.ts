import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const apiKey = String(body?.apiKey || "").trim();

    if (!apiKey || apiKey.length < 20) {
      return NextResponse.json(
        { error: "Invalid Etherscan API key." },
        { status: 400 }
      );
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

    let encryptedKey: string;
    try {
      encryptedKey = encryptSecret(apiKey);
    } catch {
      return NextResponse.json(
        { error: "Missing encryption secret for API keys." },
        { status: 500 }
      );
    }

    await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, etherscanApiKey: encryptedKey },
      update: { etherscanApiKey: encryptedKey },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const isDbUnavailable = message.includes("Can't reach database server");
    const isMissingTable =
      message.includes("UserSettings") && message.toLowerCase().includes("does not exist");

    return NextResponse.json(
      {
        error: isMissingTable
          ? "Database schema is missing settings table. Run Prisma migrations."
          : isDbUnavailable
            ? "Database is unavailable. Start Postgres and try again."
            : "Failed to save Etherscan key.",
      },
      { status: isDbUnavailable || isMissingTable ? 503 : 500 }
    );
  }
}
