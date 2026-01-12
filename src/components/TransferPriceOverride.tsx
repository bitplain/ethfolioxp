"use client";

import { useState } from "react";
import { useSettings } from "@/components/desktop/SettingsProvider";
import { postJson } from "@/lib/http";

export default function TransferPriceOverride({
  transferId,
  priceUsd,
  priceRub,
  priceManual,
}: {
  transferId: string;
  priceUsd: string | null;
  priceRub: string | null;
  priceManual: boolean;
}) {
  const { playSound } = useSettings();
  const [open, setOpen] = useState(false);
  const [usd, setUsd] = useState(priceUsd ?? "");
  const [rub, setRub] = useState(priceRub ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    playSound("click");
    setError(null);
    setMessage(null);

    if (!usd.trim() && !rub.trim()) {
      setError("Введите цену в USD или RUB.");
      return;
    }

    setLoading(true);
    try {
      const result = await postJson("/api/transfers/override", {
        transferId,
        priceUsd: usd.trim(),
        priceRub: rub.trim(),
      });

      if (!result.ok) {
        const errorMessage =
          result.data.error ||
          (result.error
            ? "Ошибка сети. Проверь соединение."
            : "Ошибка сохранения цены.");
        setError(errorMessage);
        return;
      }

      setMessage("Цена сохранена.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stack">
      <button
        className="xp-button secondary"
        type="button"
        onClick={() => {
          playSound("click");
          setOpen((prev) => !prev);
        }}
      >
        {priceManual ? "Редактировать" : "Задать цену"}
      </button>
      {open ? (
        <form className="stack" onSubmit={onSubmit}>
          <input
            className="xp-input"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            value={usd}
            onChange={(event) => setUsd(event.target.value)}
            placeholder="USD за 1"
          />
          <input
            className="xp-input"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            value={rub}
            onChange={(event) => setRub(event.target.value)}
            placeholder="RUB за 1"
          />
          {error ? <div className="notice">{error}</div> : null}
          {message ? <div className="notice">{message}</div> : null}
          <button className="xp-button" type="submit" disabled={loading}>
            {loading ? "Сохраняю..." : "Сохранить"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
