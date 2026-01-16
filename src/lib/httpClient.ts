import { metrics } from "@/lib/metrics";

type Options = {
  timeoutMs?: number;
  retries?: number;
  retryBaseMs?: number;
  cacheTtlMs?: number;
  init?: RequestInit;
};

const cache = new Map<string, { expiresAt: number; value: unknown }>();

function pruneCache(now: number) {
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
    }
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchJson<T>(url: string, options: Options = {}) {
  const timeoutMs = options.timeoutMs ?? Number(process.env.HTTP_TIMEOUT_MS || 8000);
  const retries = options.retries ?? Number(process.env.HTTP_RETRY_COUNT || 2);
  const retryBaseMs =
    options.retryBaseMs ?? Number(process.env.HTTP_RETRY_BASE_MS || 250);
  const cacheTtlMs = options.cacheTtlMs ?? Number(process.env.HTTP_CACHE_TTL_MS || 0);
  const init = options.init ?? {};
  const method = (init.method ?? "GET").toUpperCase();
  const cacheKey = `${method}:${url}`;

  if (cacheTtlMs > 0) {
    pruneCache(Date.now());
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return { ok: true, status: 200, data: cached.value as T, cached: true };
    }
  }

  const allowRetry = method === "GET";

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const start = Date.now();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        method,
        cache: "no-store",
        signal: controller.signal,
      });
      const data = (await response.json().catch(() => ({}))) as T;
      metrics.timing("external.http", Date.now() - start);

      if (!response.ok) {
        if (allowRetry && attempt < retries && response.status >= 500) {
          await sleep(retryBaseMs * (attempt + 1));
          continue;
        }
        return { ok: false, status: response.status, data };
      }

      if (cacheTtlMs > 0) {
        cache.set(cacheKey, { expiresAt: Date.now() + cacheTtlMs, value: data });
      }

      return { ok: true, status: response.status, data };
    } catch (error) {
      if (allowRetry && attempt < retries) {
        await sleep(retryBaseMs * (attempt + 1));
        continue;
      }
      return {
        ok: false,
        status: 0,
        data: {} as T,
        error: (error as Error).message,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  return { ok: false, status: 0, data: {} as T };
}

export const __testing = {
  clear() {
    cache.clear();
  },
  size() {
    return cache.size;
  },
};
