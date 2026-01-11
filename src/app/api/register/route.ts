import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email || "").toLowerCase();
    const password = String(body?.password || "");

    if (!email || !password || password.length < 6) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "User already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await hash(password, 12);
    const user = await prisma.user.create({
      data: { email, passwordHash },
    });

    if (process.env.DEFAULT_WALLET_ADDRESS) {
      await prisma.wallet.upsert({
        where: { address: process.env.DEFAULT_WALLET_ADDRESS.toLowerCase() },
        create: {
          address: process.env.DEFAULT_WALLET_ADDRESS.toLowerCase(),
          userId: user.id,
        },
        update: { userId: user.id },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Registration failed." },
      { status: 500 }
    );
  }
}
