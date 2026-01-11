"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";
import DesktopShell from "@/components/desktop/DesktopShell";
import { useSettings } from "@/components/desktop/SettingsProvider";

export default function LoginPage() {
  const { playSound } = useSettings();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    playSound("click");
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Неверный email или пароль.");
      setLoading(false);
      return;
    }

    window.location.href = "/dashboard";
  };

  return (
    <DesktopShell
      mainId="login"
      mainTitle="Вход"
      mainSubtitle="Авторизация пользователя"
    >
      <form className="stack" onSubmit={onSubmit}>
        <input
          className="xp-input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <input
          className="xp-input"
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        {error ? <div className="notice">{error}</div> : null}
        <button className="xp-button" type="submit" disabled={loading}>
          {loading ? "Входим..." : "Войти"}
        </button>
        <p className="muted">
          Нет аккаунта? <Link href="/register">Создать</Link>
        </p>
      </form>
    </DesktopShell>
  );
}
