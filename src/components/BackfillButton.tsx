"use client";

import { useState } from "react";
import { useSettings } from "@/components/desktop/SettingsProvider";

export default function BackfillButton() {
  const { playSound } = useSettings();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onBackfill = async () => {
    playSound("click");
    setLoading(true);
    setMessage(null);
    const response = await fetch("/api/prices/backfill", { method: "POST" });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(data.error || "Ошибка обновления цен.");
      setLoading(false);
      return;
    }

    playSound("notify");
    setMessage("Обновление цен запущено в фоне.");
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <button className="xp-button secondary" onClick={onBackfill} disabled={loading}>
        {loading ? "Обновляю..." : "Догрузить цены"}
      </button>
      {message ? <span className="muted">{message}</span> : null}
    </div>
  );
}
