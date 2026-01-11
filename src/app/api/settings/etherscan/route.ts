import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const apiKey = String(body?.apiKey || "").trim();

  if (!apiKey || apiKey.length < 20) {
    return NextResponse.json(
      { error: "Invalid Etherscan API key." },
      { status: 400 }
    );
  }

  await prisma.userSettings.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, etherscanApiKey: apiKey },
    update: { etherscanApiKey: apiKey },
  });

  return NextResponse.json({ ok: true });
}
