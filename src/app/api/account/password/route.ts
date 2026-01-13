import { hash, compare } from "bcryptjs";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { validatePassword } from "@/lib/validation";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const currentPassword = String(body?.currentPassword || "");
    const passwordCheck = validatePassword(String(body?.newPassword ?? ""));

    if (!currentPassword || !passwordCheck.ok) {
      return NextResponse.json(
        { error: "Invalid current or new password." },
        { status: 400 }
      );
    }
    const newPassword = passwordCheck.value;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const isValid = await compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Неверный текущий пароль." },
        { status: 400 }
      );
    }

    const passwordHash = await hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
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
          : "Password update failed.",
      },
      { status: isDbUnavailable ? 503 : 500 }
    );
  }
}
