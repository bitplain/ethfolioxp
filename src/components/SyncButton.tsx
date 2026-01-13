"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSettings } from "@/components/desktop/SettingsProvider";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { runSync } from "@/lib/syncAction";

export default function SyncButton() {
  const { playSound } = useSettings();
  const router = useRouter();
  const online = useNetworkStatus();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onSync = async () => {
    playSound("click");
      setLoading(true);
      setMessage(null);
    try {
      const result = await runSync({
        onSuccess: () => router.refresh(),
      });
      setMessage(result.message);
      if (result.ok) {
        playSound("notify");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <button className="xp-button" onClick={onSync} disabled={loading || !online}>
        {loading ? "Синхронизация..." : "Синхронизировать"}
      </button>
      {message ? (
        <span className="muted">{message}</span>
      ) : !online ? (
        <span className="muted">Нет соединения.</span>
      ) : null}
    </div>
  );
}
