"use client";

import { useState } from "react";
import { useSettings } from "@/components/desktop/SettingsProvider";

export default function WalletForm({ initialAddress }: { initialAddress: string }) {
  const { playSound } = useSettings();
  const [address, setAddress] = useState(initialAddress);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    playSound("click");
    setLoading(true);
    setMessage(null);

    const response = await fetch("/api/wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(data.error || "Ошибка сохранения.");
      setLoading(false);
      return;
    }

    setMessage("Адрес сохранен.");
    setLoading(false);
  };

  return (
    <form className="stack" onSubmit={onSubmit}>
      <input
        className="xp-input"
        value={address}
        onChange={(event) => setAddress(event.target.value)}
        placeholder="0x..."
        required
      />
      {message ? <div className="notice">{message}</div> : null}
      <button className="xp-button" type="submit" disabled={loading}>
        {loading ? "Сохраняю..." : "Сохранить"}
      </button>
    </form>
  );
}
