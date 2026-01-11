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

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as { rates?: { RUB?: number } };
    const rate = data?.rates?.RUB;
    if (rate) {
      FX_CACHE.set(cacheKey, rate);
      return rate;
    }
  } catch {
    return null;
  }

  return null;
}
