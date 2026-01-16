const buckets = new Map<string, { count: number; resetAt: number }>();
let lastCleanup = 0;

function cleanupBuckets(now: number) {
  for (const [key, entry] of buckets.entries()) {
    if (entry.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  if (buckets.size > 1000 || now - lastCleanup >= 60_000) {
    cleanupBuckets(now);
    lastCleanup = now;
  }
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    const next = { count: 1, resetAt: now + windowMs };
    buckets.set(key, next);
    return { ok: true, remaining: limit - 1, resetAt: next.resetAt };
  }

  if (current.count >= limit) {
    return { ok: false, remaining: 0, resetAt: current.resetAt };
  }

  current.count += 1;
  return {
    ok: true,
    remaining: Math.max(0, limit - current.count),
    resetAt: current.resetAt,
  };
}

export const __testing = {
  clear() {
    buckets.clear();
    lastCleanup = 0;
  },
  size() {
    return buckets.size;
  },
};
