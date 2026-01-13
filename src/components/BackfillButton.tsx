"use client";

import { useState } from "react";
import { useSettings } from "@/components/desktop/SettingsProvider";
import { postJson } from "@/lib/http";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export default function BackfillButton() {
  const { playSound } = useSettings();
  const online = useNetworkStatus();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onBackfill = async () => {
    playSound("click");
    setLoading(true);
    setMessage(null);
    try {
      const result = await postJson("/api/prices/backfill");

      if (!result.ok) {
        const errorMessage =
          result.data.error ||
          (result.error
            ? "Ошибка сети. Проверь соединение."
            : "Ошибка обновления цен.");
        setMessage(errorMessage);
        return;
      }

      playSound("notify");
      if (
        typeof result.data.updated === "number" &&
        typeof result.data.scanned === "number"
      ) {
        setMessage(`Обновлено ${result.data.updated} из ${result.data.scanned}.`);
      } else {
        setMessage("Обновление цен завершено.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <button
        className="xp-button secondary"
        onClick={onBackfill}
        disabled={loading || !online}
      >
        {loading ? "Обновляю..." : "Догрузить цены"}
      </button>
      {message ? (
        <span className="muted">{message}</span>
      ) : !online ? (
        <span className="muted">Нет соединения.</span>
      ) : null}
    </div>
  );
}
