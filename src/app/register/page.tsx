"use client";

import Link from "next/link";
import { useState } from "react";
import { useSettings } from "@/components/desktop/SettingsProvider";

export default function RegisterPage() {
  const { playSound } = useSettings();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    playSound("click");
    setLoading(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error || "Ошибка регистрации.");
      setLoading(false);
      return;
    }

    setMessage("Аккаунт создан. Теперь войдите.");
    setLoading(false);
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
            <div className="login-greeting-title">Создайте учетную запись</div>
            <div className="login-greeting-subtitle">
              Заполните данные, чтобы открыть рабочий стол.
            </div>
          </div>
        </div>
        <div className="login-form">
          <div className="login-form-header">Регистрация</div>
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
              placeholder="Пароль (мин. 6 символов)"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            {error ? <div className="notice">{error}</div> : null}
            {message ? <div className="notice">{message}</div> : null}
            <button className="xp-button" type="submit" disabled={loading}>
              {loading ? "Создаю..." : "Создать"}
            </button>
            <p className="muted">
              Уже есть аккаунт? <Link href="/login">Войти</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
