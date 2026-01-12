"use client";

import { useState } from "react";
import { useSettings } from "@/components/desktop/SettingsProvider";
import { postJson } from "@/lib/http";

export default function SyncButton() {
  const { playSound } = useSettings();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onSync = async () => {
    playSound("click");
    setLoading(true);
    setMessage(null);
    try {
      const result = await postJson("/api/sync");

      if (!result.ok) {
        const errorMessage =
          result.data.error ||
          (result.error
            ? "Ошибка сети. Проверь соединение."
            : "Ошибка синхронизации");
        setMessage(errorMessage);
        return;
      }

      playSound("notify");
      setMessage(`Синхронизировано: +${result.data.created ?? 0} записей.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <button className="xp-button" onClick={onSync} disabled={loading}>
        {loading ? "Синхронизация..." : "Синхронизировать"}
      </button>
      {message ? <span className="muted">{message}</span> : null}
    </div>
  );
}
