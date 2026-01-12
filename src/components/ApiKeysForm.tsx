"use client";

import { useState } from "react";
import { useSettings } from "@/components/desktop/SettingsProvider";
import { postJson } from "@/lib/http";

type ApiKeyEntry = { name: string; value: string };

export default function ApiKeysForm({
  initialMoralisKey,
  initialKeys,
}: {
  initialMoralisKey: string;
  initialKeys: ApiKeyEntry[];
}) {
  const { playSound } = useSettings();
  const [moralisApiKey, setMoralisApiKey] = useState(initialMoralisKey);
  const [showMoralisKey, setShowMoralisKey] = useState(false);
  const [keys, setKeys] = useState<ApiKeyEntry[]>(initialKeys);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const addKey = () => {
    setKeys((prev) => [...prev, { name: "", value: "" }]);
  };

  const updateKey = (index: number, field: "name" | "value", value: string) => {
    setKeys((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeKey = (index: number) => {
    setKeys((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    playSound("click");
    setError(null);
    setMessage(null);

    setLoading(true);
    try {
      const result = await postJson("/api/settings/keys", {
        moralisApiKey,
        apiKeys: keys,
      });

      if (!result.ok) {
        const errorMessage =
          result.data.error ||
          (result.error
            ? "Ошибка сети. Проверь соединение."
            : "Ошибка сохранения ключей.");
        setError(errorMessage);
        return;
      }

      setMessage("Ключи сохранены.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="stack" onSubmit={onSubmit}>
      <div className="panel">
        <div className="panel-title">Moralis API</div>
        <input
          className="xp-input"
          type={showMoralisKey ? "text" : "password"}
          value={moralisApiKey}
          onChange={(event) => setMoralisApiKey(event.target.value)}
          placeholder="Moralis API key"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <div className="button-row">
          <button
            className="xp-button secondary"
            type="button"
            onClick={() => {
              playSound("click");
              setShowMoralisKey((prev) => !prev);
            }}
          >
            {showMoralisKey ? "Скрыть" : "Показать"}
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">Дополнительные ключи</div>
        <div className="muted">
          Эти ключи сохраняются для будущих интеграций и не используются напрямую.
        </div>
        <div className="api-keys-list">
          {keys.map((entry, index) => (
            <div className="api-keys-row" key={`${entry.name}-${index}`}>
              <input
                className="xp-input"
                placeholder="Название (например, Alchemy)"
                value={entry.name}
                onChange={(event) => updateKey(index, "name", event.target.value)}
              />
              <input
                className="xp-input"
                placeholder="API key"
                value={entry.value}
                onChange={(event) => updateKey(index, "value", event.target.value)}
              />
              <button
                className="xp-button secondary"
                type="button"
                onClick={() => removeKey(index)}
              >
                Удалить
              </button>
            </div>
          ))}
        </div>
        <div className="button-row">
          <button
            className="xp-button secondary"
            type="button"
            onClick={addKey}
          >
            Добавить ключ
          </button>
        </div>
      </div>

      <div className="button-row">
        <button className="xp-button" type="submit" disabled={loading}>
          {loading ? "Сохраняю..." : "Сохранить"}
        </button>
      </div>
      {error ? <div className="notice">{error}</div> : null}
      {message ? <div className="notice">{message}</div> : null}
    </form>
  );
}
