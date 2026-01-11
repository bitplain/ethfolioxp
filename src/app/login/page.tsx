"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";
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
    <div className="login-screen">
      <div className="login-panel">
        <div className="login-hero">
          <div className="login-brand">
            <span
              className="login-brand-icon"
              style={{ backgroundImage: "url(/icons/xp/window.png)" }}
              aria-hidden
            />
            <div>
              <div className="login-brand-title">RetroDesk</div>
              <div className="login-brand-subtitle">XP-workspace для крипто-приложений</div>
            </div>
          </div>
          <div className="login-greeting">
            <div className="login-avatar" aria-hidden />
            <div className="login-greeting-title">Добро пожаловать</div>
            <div className="login-greeting-subtitle">
              Войдите, чтобы открыть рабочий стол.
            </div>
          </div>
        </div>
        <div className="login-form">
          <div className="login-form-header">Авторизация</div>
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
        </div>
      </div>
    </div>
  );
}
