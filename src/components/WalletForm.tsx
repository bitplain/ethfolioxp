"use client";

import { useState } from "react";
import { useSettings } from "@/components/desktop/SettingsProvider";
import { postJson } from "@/lib/http";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export default function WalletForm({ initialAddress }: { initialAddress: string }) {
  const { playSound } = useSettings();
  const online = useNetworkStatus();
  const [address, setAddress] = useState(initialAddress);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    playSound("click");
    setLoading(true);
    setMessage(null);

    try {
      const result = await postJson("/api/wallet", { address });

      if (!result.ok) {
        const errorMessage =
          result.data.error ||
          (result.error ? "Ошибка сети. Проверь соединение." : "Ошибка сохранения.");
        setMessage(errorMessage);
        return;
      }

      setMessage("Адрес сохранен.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="stack" onSubmit={onSubmit}>
      <input
        className="xp-input"
        value={address}
        onChange={(event) => setAddress(event.target.value)}
        placeholder="0x..."
        disabled={!online}
        required
      />
      {!online ? <div className="muted">Нет соединения.</div> : null}
      {message ? <div className="notice">{message}</div> : null}
      <button className="xp-button" type="submit" disabled={loading || !online}>
        {loading ? "Сохраняю..." : "Сохранить"}
      </button>
    </form>
  );
}
