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

    return NextResponse.json({ ok: true });
  } catch (error) {
    const isDbUnavailable =
      error instanceof Error &&
      error.message.includes("Can't reach database server");

    return NextResponse.json(
      {
        error: isDbUnavailable
          ? "Database is unavailable. Start Postgres and try again."
          : "Registration failed.",
      },
      { status: isDbUnavailable ? 503 : 500 }
    );
  }
}
