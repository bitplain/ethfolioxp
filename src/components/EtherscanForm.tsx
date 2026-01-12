"use client";

import { useState } from "react";
import { useSettings } from "@/components/desktop/SettingsProvider";
import { postJson } from "@/lib/http";

export default function EtherscanForm({ hasKey }: { hasKey: boolean }) {
  const { playSound } = useSettings();
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    playSound("click");
    setLoading(true);
    setMessage(null);

    try {
      const result = await postJson("/api/settings/etherscan", { apiKey });

      if (!result.ok) {
        const errorMessage =
          result.data.error ||
          (result.error
            ? "Ошибка сети. Проверь соединение."
            : "Ошибка сохранения ключа.");
        setMessage(errorMessage);
        return;
      }

      setMessage("Ключ сохранен.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="stack" onSubmit={onSubmit}>
      <input
        className="xp-input"
        type={showKey ? "text" : "password"}
        value={apiKey}
        onChange={(event) => setApiKey(event.target.value)}
        placeholder="Etherscan API key"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        required
      />
      {hasKey ? (
        <div className="muted">Ключ уже сохранен в базе.</div>
      ) : (
        <div className="muted">Ключ пока не задан.</div>
      )}
      <div className="button-row">
        <button
          className="xp-button secondary"
          type="button"
          onClick={() => {
            playSound("click");
            setShowKey((prev) => !prev);
          }}
        >
          {showKey ? "Скрыть" : "Показать"}
        </button>
        <button className="xp-button" type="submit" disabled={loading}>
          {loading ? "Сохраняю..." : "Сохранить"}
        </button>
      </div>
      {message ? <div className="notice">{message}</div> : null}
    </form>
  );
}
