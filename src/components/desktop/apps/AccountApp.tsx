"use client";

import { useState } from "react";
import { useSettings } from "@/components/desktop/SettingsProvider";

export default function AccountApp({ email }: { email?: string | null }) {
  const { playSound } = useSettings();
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    playSound("click");
    setError(null);
    setMessage(null);

    if (!currentPassword || nextPassword.length < 6) {
      setError("Введите текущий пароль и новый пароль (минимум 6 символов).");
      return;
    }

    if (nextPassword !== confirmPassword) {
      setError("Новый пароль и подтверждение не совпадают.");
      return;
    }

    setLoading(true);

    const response = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword,
        newPassword: nextPassword,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(data.error || "Ошибка смены пароля.");
      setLoading(false);
      return;
    }

    setMessage("Пароль обновлен.");
    setCurrentPassword("");
    setNextPassword("");
    setConfirmPassword("");
    setLoading(false);
  };

  return (
    <div className="stack">
      <div className="panel">
        <div className="panel-title">Текущий пользователь</div>
        <p className="muted">
          {email ? `Вы вошли как: ${email}` : "Почта пользователя недоступна."}
        </p>
      </div>

      <div className="panel">
        <div className="panel-title">Смена пароля</div>
        <form className="stack" onSubmit={onSubmit}>
          <input
            className="xp-input"
            type="password"
            placeholder="Текущий пароль"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
          />
          <input
            className="xp-input"
            type="password"
            placeholder="Новый пароль"
            value={nextPassword}
            onChange={(event) => setNextPassword(event.target.value)}
            required
          />
          <input
            className="xp-input"
            type="password"
            placeholder="Повторите новый пароль"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />
          {error ? <div className="notice">{error}</div> : null}
          {message ? <div className="notice">{message}</div> : null}
          <button className="xp-button" type="submit" disabled={loading}>
            {loading ? "Сохраняю..." : "Сменить пароль"}
          </button>
        </form>
      </div>
    </div>
  );
}
