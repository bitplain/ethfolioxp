import { fetchJson } from "@/lib/httpClient";

const FX_CACHE = new Map<number, number>();

function toIsoDate(timestampSec: number) {
  return new Date(timestampSec * 1000).toISOString().slice(0, 10);
}

export async function fetchUsdRubRate(timestampSec: number) {
  const cacheKey = Math.floor(timestampSec / 86400);
  const cached = FX_CACHE.get(cacheKey);
  if (cached) {
    return cached;
  }

  const date = toIsoDate(timestampSec);
  const url = `https://api.exchangerate.host/${date}?base=USD&symbols=RUB`;

  const result = await fetchJson<{ rates?: { RUB?: number } }>(url, {
    cacheTtlMs: 3600_000,
  });
  if (!result.ok) {
    return null;
  }
  const rate = result.data?.rates?.RUB;
  if (rate) {
    FX_CACHE.set(cacheKey, rate);
    return rate;
  }

  return null;
}
