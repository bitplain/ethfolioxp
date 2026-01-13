import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request";
import { validateEmail, validatePassword } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const emailCheck = validateEmail(String(body?.email ?? ""));
    const passwordCheck = validatePassword(String(body?.password ?? ""));

    if (!emailCheck.ok || !passwordCheck.ok) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 400 }
      );
    }

    const email = emailCheck.value;
    const password = passwordCheck.value;
    const ip = getClientIp(request.headers);
    const ipResult = rateLimit(`register:ip:${ip}`, 10, 60_000);
    const emailResult = rateLimit(`register:email:${email}`, 5, 60_000);

    if (!ipResult.ok || !emailResult.ok) {
      return NextResponse.json(
        { error: "Too many attempts. Try later." },
        { status: 429 }
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
