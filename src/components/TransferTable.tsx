"use client";

import { memo, useEffect, useRef, useState } from "react";
import TransferPriceOverride from "@/components/TransferPriceOverride";
import { getJson } from "@/lib/http";
import { scheduleIdle } from "@/lib/idle";
import { DEFAULT_TRANSFER_LIMIT } from "@/lib/transferPagination";

type TransferRow = {
  id: string;
  txHash: string;
  logIndex: number;
  blockTime: string;
  direction: "IN" | "OUT";
  amount: string;
  priceUsd: string | null;
  valueUsd: string | null;
  priceRub: string | null;
  valueRub: string | null;
  priceManual: boolean;
  token: { symbol: string; name: string };
};

function TransferTable({
  initial,
  initialCursor,
}: {
  initial: TransferRow[];
  initialCursor: string | null;
}) {
  const [rows, setRows] = useState(initial);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const prefetchRef = useRef<{
    cursor: string;
    transfers: TransferRow[];
    nextCursor: string | null;
  } | null>(null);
  const prefetchingRef = useRef(false);

  useEffect(() => {
    if (!cursor) {
      prefetchRef.current = null;
    } else if (prefetchRef.current?.cursor !== cursor) {
      prefetchRef.current = null;
    }
  }, [cursor]);

  useEffect(() => {
    if (!cursor || loading) {
      return;
    }
    if (prefetchRef.current?.cursor === cursor || prefetchingRef.current) {
      return;
    }

    const cancel = scheduleIdle(() => {
      if (!cursor || prefetchingRef.current) {
        return;
      }
      if (prefetchRef.current?.cursor === cursor) {
        return;
      }

      prefetchingRef.current = true;
      const query = new URLSearchParams({
        limit: String(DEFAULT_TRANSFER_LIMIT),
        cursor,
      });

      getJson(`/api/transfers?${query.toString()}`)
        .then((result) => {
          if (result.ok && Array.isArray(result.data.transfers)) {
            prefetchRef.current = {
              cursor,
              transfers: result.data.transfers,
              nextCursor: result.data.nextCursor ?? null,
            };
          }
        })
        .finally(() => {
          prefetchingRef.current = false;
        });
    });

    return () => cancel();
  }, [cursor, loading]);

  const loadMore = async () => {
    if (!cursor || loading) {
      return;
    }
    setLoading(true);
    try {
      const prefetched = prefetchRef.current;
      if (prefetched?.cursor === cursor) {
        prefetchRef.current = null;
        setRows((prev) => [...prev, ...prefetched.transfers]);
        setCursor(prefetched.nextCursor ?? null);
        return;
      }

      const query = new URLSearchParams({
        limit: String(DEFAULT_TRANSFER_LIMIT),
      });
      query.set("cursor", cursor);
      const result = await getJson(`/api/transfers?${query.toString()}`);
      if (result.ok && Array.isArray(result.data.transfers)) {
        setRows((prev) => [...prev, ...result.data.transfers]);
        setCursor(result.data.nextCursor ?? null);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel">
      <div className="panel-title">Последние транзакции</div>
      {rows.length ? (
        <div className="table-scroll">
          <table className="xp-table">
            <thead>
              <tr>
                <th>Время</th>
                <th>Токен</th>
                <th>Направление</th>
                <th>Количество</th>
                <th>Цена (USD)</th>
                <th>Сумма (USD)</th>
                <th>Цена (RUB)</th>
                <th>Сумма (RUB)</th>
                <th>Корректировка</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((tx) => {
                const showRub = tx.direction === "IN";
                return (
                  <tr key={`${tx.txHash}-${tx.logIndex}`}>
                    <td>{new Date(tx.blockTime).toLocaleString("ru-RU")}</td>
                    <td>{tx.token.symbol}</td>
                    <td>{tx.direction === "IN" ? "Вход" : "Выход"}</td>
                    <td>{Number(tx.amount).toFixed(4)}</td>
                    <td>{tx.priceUsd ? Number(tx.priceUsd).toFixed(2) : "-"}</td>
                    <td>{tx.valueUsd ? Number(tx.valueUsd).toFixed(2) : "-"}</td>
                    <td>
                      {showRub && tx.priceRub ? Number(tx.priceRub).toFixed(2) : "-"}
                    </td>
                    <td>
                      {showRub && tx.valueRub ? Number(tx.valueRub).toFixed(2) : "-"}
                    </td>
                    <td>
                      <TransferPriceOverride
                        transferId={tx.id}
                        priceUsd={tx.priceUsd}
                        priceRub={tx.priceRub}
                        priceManual={tx.priceManual}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">Транзакций пока нет.</p>
      )}
      <div className="button-row">
        <button
          className="xp-button secondary"
          type="button"
          onClick={loadMore}
          disabled={loading || !cursor}
        >
          {loading ? "Загрузка..." : cursor ? "Показать еще" : "Больше нет"}
        </button>
      </div>
    </div>
  );
}

export default memo(TransferTable);
