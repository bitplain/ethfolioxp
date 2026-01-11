"use client";

import { useState } from "react";
import { useSettings } from "@/components/desktop/SettingsProvider";

export default function SyncButton() {
  const { playSound } = useSettings();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onSync = async () => {
    playSound("click");
    setLoading(true);
    setMessage(null);
    const response = await fetch("/api/sync", { method: "POST" });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(data.error || "Ошибка синхронизации");
      setLoading(false);
      return;
    }

    playSound("notify");
    setMessage(`Синхронизировано: +${data.created} записей.`);
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <button className="xp-button" onClick={onSync} disabled={loading}>
        {loading ? "Синхронизация..." : "Синхронизировать"}
      </button>
      {message ? <span className="muted">{message}</span> : null}
    </div>
  );
}
