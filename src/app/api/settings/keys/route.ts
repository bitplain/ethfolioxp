import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/db";

type ApiKeyEntry = { name: string; value: string };

function sanitizeKeys(raw: unknown): ApiKeyEntry[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((entry) => ({
      name: String((entry as ApiKeyEntry)?.name || "").trim(),
      value: String((entry as ApiKeyEntry)?.value || "").trim(),
    }))
    .filter((entry) => entry.name && entry.value);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const moralisApiKey = String(body?.moralisApiKey || "").trim();
    const apiKeys = sanitizeKeys(body?.apiKeys);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found. Please sign in again." },
        { status: 401 }
      );
    }

    let encryptedMoralis: string | null = null;
    let encryptedKeys: ApiKeyEntry[] = [];
    try {
      encryptedMoralis = moralisApiKey ? encryptSecret(moralisApiKey) : null;
      encryptedKeys = apiKeys.map((entry) => ({
        name: entry.name,
        value: encryptSecret(entry.value),
      }));
    } catch {
      return NextResponse.json(
        { error: "Missing encryption secret for API keys." },
        { status: 500 }
      );
    }

    await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        moralisApiKey: encryptedMoralis,
        apiKeys: encryptedKeys.length ? encryptedKeys : Prisma.JsonNull,
      },
      update: {
        moralisApiKey: encryptedMoralis,
        apiKeys: encryptedKeys.length ? encryptedKeys : Prisma.JsonNull,
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
          : "Failed to save API keys.",
      },
      { status: isDbUnavailable ? 503 : 500 }
    );
  }
}
