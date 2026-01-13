# Ethfolio Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** harden auth/security, improve reliability and performance, add observability + cleanup paths, and document APIs/ops without external services.

**Architecture:** introduce small shared utilities (validation, rate limiting, HTTP client, logging, metrics, pagination) and update API routes + sync logic to use them. Add a client-side transfer table with cursor pagination and basic offline banner. Keep changes incremental with unit tests for each helper.

**Tech Stack:** Next.js App Router, NextAuth, Prisma, React, Vitest.

---

### Task 1: Password + email validation utilities

**Files:**
- Create: `src/lib/validation.ts`
- Create: `src/lib/__tests__/validation.test.ts`
- Modify: `src/app/api/register/route.ts`
- Modify: `src/app/api/account/password/route.ts`
- Modify: `src/app/register/page.tsx`

**Step 1: Write the failing test**

```ts
// src/lib/__tests__/validation.test.ts
import { describe, expect, test } from "vitest";
import { validateEmail, validatePassword } from "@/lib/validation";

describe("validateEmail", () => {
  test("rejects invalid email and accepts valid", () => {
    expect(validateEmail("nope").ok).toBe(false);
    expect(validateEmail("user@example.com").ok).toBe(true);
  });
});

describe("validatePassword", () => {
  test("enforces length and character diversity", () => {
    expect(validatePassword("short").ok).toBe(false);
    expect(validatePassword("alllowercasebutlong").ok).toBe(false);
    expect(validatePassword("Valid123!").ok).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/__tests__/validation.test.ts`
Expected: FAIL (`validateEmail` not found)

**Step 3: Write minimal implementation**

```ts
// src/lib/validation.ts
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(value: string) {
  const email = value.trim().toLowerCase();
  if (!email || email.length > 320 || !EMAIL_RE.test(email)) {
    return { ok: false, error: "Invalid email." };
  }
  return { ok: true, value: email };
}

export function validatePassword(value: string) {
  const password = value.trim();
  const rules = [
    password.length >= 10,
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^a-zA-Z0-9]/.test(password),
  ];
  if (!rules.every(Boolean)) {
    return { ok: false, error: "Weak password." };
  }
  return { ok: true, value: password };
}
```

**Step 4: Wire validation into API routes and UI**

```ts
// src/app/api/register/route.ts
import { validateEmail, validatePassword } from "@/lib/validation";
...
const emailCheck = validateEmail(String(body?.email ?? ""));
const passwordCheck = validatePassword(String(body?.password ?? ""));
if (!emailCheck.ok || !passwordCheck.ok) {
  return NextResponse.json({ error: "Invalid email or password." }, { status: 400 });
}
const email = emailCheck.value;
const password = passwordCheck.value;
```

```ts
// src/app/api/account/password/route.ts
import { validatePassword } from "@/lib/validation";
...
const nextCheck = validatePassword(String(body?.newPassword ?? ""));
if (!currentPassword || !nextCheck.ok) {
  return NextResponse.json({ error: "Invalid current or new password." }, { status: 400 });
}
const newPassword = nextCheck.value;
```

```tsx
// src/app/register/page.tsx (add a short hint)
<input ... minLength={10} />
<div className="muted">Пароль: 10+ символов, буквы в обоих регистрах, цифра и символ.</div>
```

**Step 5: Run tests and commit**

Run: `npm test -- src/lib/__tests__/validation.test.ts`
Expected: PASS

```bash
git add src/lib/validation.ts src/lib/__tests__/validation.test.ts \
  src/app/api/register/route.ts src/app/api/account/password/route.ts \
  src/app/register/page.tsx

git commit -m "feat: add email and password validation"
```

---

### Task 2: Rate limiting for auth endpoints

**Files:**
- Create: `src/lib/rateLimit.ts`
- Create: `src/lib/request.ts`
- Create: `src/lib/__tests__/rate-limit.test.ts`
- Modify: `src/app/api/register/route.ts`
- Modify: `src/lib/auth.ts`

**Step 1: Write the failing test**

```ts
// src/lib/__tests__/rate-limit.test.ts
import { describe, expect, test } from "vitest";
import { rateLimit } from "@/lib/rateLimit";

describe("rateLimit", () => {
  test("blocks after limit within window", () => {
    const key = "ip:1.1.1.1";
    const limit = 2;
    const windowMs = 1000;

    expect(rateLimit(key, limit, windowMs).ok).toBe(true);
    expect(rateLimit(key, limit, windowMs).ok).toBe(true);
    expect(rateLimit(key, limit, windowMs).ok).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/__tests__/rate-limit.test.ts`
Expected: FAIL (`rateLimit` not found)

**Step 3: Implement rate limiter + IP helper**

```ts
// src/lib/rateLimit.ts
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
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
  return { ok: true, remaining: Math.max(0, limit - current.count), resetAt: current.resetAt };
}
```

```ts
// src/lib/request.ts
export function getClientIp(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return headers.get("x-real-ip") || "unknown";
}
```

**Step 4: Apply rate limiting in register + login**

```ts
// src/app/api/register/route.ts
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request";
...
const ip = getClientIp(request.headers);
const emailKey = `email:${email}`;
const ipKey = `ip:${ip}`;
const ipResult = rateLimit(ipKey, 10, 60_000);
const emailResult = rateLimit(emailKey, 5, 60_000);
if (!ipResult.ok || !emailResult.ok) {
  return NextResponse.json({ error: "Too many attempts. Try позже." }, { status: 429 });
}
```

```ts
// src/lib/auth.ts
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request";
...
async authorize(credentials, req) {
  ...
  const ip = getClientIp(req.headers);
  const ipResult = rateLimit(`login:ip:${ip}`, 20, 60_000);
  const emailResult = rateLimit(`login:email:${credentials.email}`, 10, 60_000);
  if (!ipResult.ok || !emailResult.ok) {
    return null;
  }
  ...
}
```

**Step 5: Run tests and commit**

Run: `npm test -- src/lib/__tests__/rate-limit.test.ts`
Expected: PASS

```bash
git add src/lib/rateLimit.ts src/lib/request.ts src/lib/__tests__/rate-limit.test.ts \
  src/app/api/register/route.ts src/lib/auth.ts

git commit -m "feat: add auth rate limiting"
```

---

### Task 3: Secret validation and config guard

**Files:**
- Create: `src/lib/config.ts`
- Create: `src/lib/__tests__/config.test.ts`
- Modify: `src/lib/crypto.ts`
- Modify: `src/lib/auth.ts`
- Modify: `.env.example`

**Step 1: Write the failing test**

```ts
// src/lib/__tests__/config.test.ts
import { describe, expect, test } from "vitest";
import { validateSecretValue } from "@/lib/config";

test("validateSecretValue rejects placeholders", () => {
  expect(validateSecretValue("replace-with-strong-secret").ok).toBe(false);
  expect(validateSecretValue("super-secret").ok).toBe(true);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/__tests__/config.test.ts`
Expected: FAIL (`validateSecretValue` not found)

**Step 3: Implement config guard**

```ts
// src/lib/config.ts
const PLACEHOLDER = "replace-with-strong-secret";

export function validateSecretValue(value: string | undefined) {
  if (!value || value.trim().length < 16 || value.includes(PLACEHOLDER)) {
    return { ok: false };
  }
  return { ok: true };
}

export function assertSecureSecrets() {
  if (process.env.NODE_ENV !== "production") {
    return;
  }
  const nextAuth = validateSecretValue(process.env.NEXTAUTH_SECRET);
  const keys = validateSecretValue(process.env.KEYS_ENCRYPTION_SECRET || process.env.NEXTAUTH_SECRET);
  if (!nextAuth.ok || !keys.ok) {
    throw new Error("Missing or weak secrets in production.");
  }
}
```

**Step 4: Wire into auth + crypto**

```ts
// src/lib/auth.ts
import { assertSecureSecrets } from "@/lib/config";
assertSecureSecrets();
```

```ts
// src/lib/crypto.ts
import { validateSecretValue } from "@/lib/config";
...
const secret = process.env.KEYS_ENCRYPTION_SECRET || process.env.NEXTAUTH_SECRET;
if (!validateSecretValue(secret).ok) {
  return null;
}
```

```dotenv
# .env.example
NEXTAUTH_SECRET=""
KEYS_ENCRYPTION_SECRET=""
```

**Step 5: Run tests and commit**

Run: `npm test -- src/lib/__tests__/config.test.ts`
Expected: PASS

```bash
git add src/lib/config.ts src/lib/__tests__/config.test.ts src/lib/crypto.ts src/lib/auth.ts .env.example

git commit -m "feat: guard weak secrets in production"
```

---

### Task 4: Resilient HTTP client + metrics

**Files:**
- Create: `src/lib/httpClient.ts`
- Create: `src/lib/metrics.ts`
- Create: `src/lib/__tests__/http-client.test.ts`
- Create: `src/lib/__tests__/metrics.test.ts`
- Modify: `src/lib/fx.ts`
- Modify: `src/lib/sync.ts`
- Modify: `.env.example`
- Create: `src/app/api/metrics/route.ts`

**Step 1: Write failing tests**

```ts
// src/lib/__tests__/http-client.test.ts
import { describe, expect, test, vi } from "vitest";
import { fetchJson } from "@/lib/httpClient";

test("fetchJson returns ok false on failure", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  const result = await fetchJson("https://example.com", { timeoutMs: 10 });
  expect(result.ok).toBe(false);
});
```

```ts
// src/lib/__tests__/metrics.test.ts
import { describe, expect, test } from "vitest";
import { metrics } from "@/lib/metrics";

test("metrics increments counters", () => {
  metrics.increment("external.calls");
  expect(metrics.snapshot().counters["external.calls"]).toBeGreaterThan(0);
});
```

**Step 2: Run tests to verify failure**

Run: `npm test -- src/lib/__tests__/http-client.test.ts src/lib/__tests__/metrics.test.ts`
Expected: FAIL (`fetchJson`/`metrics` not found)

**Step 3: Implement HTTP client + metrics**

```ts
// src/lib/metrics.ts
type Snapshot = {
  counters: Record<string, number>;
  timers: Record<string, { count: number; totalMs: number }>;
};

const state: Snapshot = { counters: {}, timers: {} };

export const metrics = {
  increment(name: string, by = 1) {
    state.counters[name] = (state.counters[name] ?? 0) + by;
  },
  timing(name: string, ms: number) {
    const entry = state.timers[name] ?? { count: 0, totalMs: 0 };
    entry.count += 1;
    entry.totalMs += ms;
    state.timers[name] = entry;
  },
  snapshot(): Snapshot {
    return JSON.parse(JSON.stringify(state)) as Snapshot;
  },
};
```

```ts
// src/lib/httpClient.ts
import { metrics } from "@/lib/metrics";

type Options = {
  timeoutMs?: number;
  retries?: number;
  retryBaseMs?: number;
  cacheTtlMs?: number;
};

const cache = new Map<string, { expiresAt: number; value: unknown }>();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchJson<T>(url: string, options: Options = {}) {
  const timeoutMs = options.timeoutMs ?? Number(process.env.HTTP_TIMEOUT_MS || 8000);
  const retries = options.retries ?? Number(process.env.HTTP_RETRY_COUNT || 2);
  const retryBaseMs = options.retryBaseMs ?? Number(process.env.HTTP_RETRY_BASE_MS || 250);
  const cacheTtlMs = options.cacheTtlMs ?? Number(process.env.HTTP_CACHE_TTL_MS || 0);

  if (cacheTtlMs > 0) {
    const cached = cache.get(url);
    if (cached && cached.expiresAt > Date.now()) {
      return { ok: true, status: 200, data: cached.value as T, cached: true };
    }
  }

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const start = Date.now();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { cache: "no-store", signal: controller.signal });
      const data = (await response.json().catch(() => ({}))) as T;
      metrics.timing("external.http", Date.now() - start);

      if (!response.ok) {
        if (attempt < retries && response.status >= 500) {
          await sleep(retryBaseMs * (attempt + 1));
          continue;
        }
        return { ok: false, status: response.status, data };
      }

      if (cacheTtlMs > 0) {
        cache.set(url, { expiresAt: Date.now() + cacheTtlMs, value: data });
      }
      return { ok: true, status: response.status, data };
    } catch (error) {
      if (attempt < retries) {
        await sleep(retryBaseMs * (attempt + 1));
        continue;
      }
      return { ok: false, status: 0, data: {} as T, error: (error as Error).message };
    } finally {
      clearTimeout(timer);
    }
  }

  return { ok: false, status: 0, data: {} as T };
}
```

```ts
// src/app/api/metrics/route.ts
import { NextResponse } from "next/server";
import { metrics } from "@/lib/metrics";

export async function GET() {
  return NextResponse.json({ ok: true, ...metrics.snapshot() });
}
```

**Step 4: Update FX + sync to use fetchJson**

```ts
// src/lib/fx.ts
import { fetchJson } from "@/lib/httpClient";
...
const result = await fetchJson<{ rates?: { RUB?: number } }>(url, { cacheTtlMs: 3600_000 });
if (!result.ok) return null;
const rate = result.data?.rates?.RUB;
```

```ts
// src/lib/sync.ts
import { fetchJson } from "@/lib/httpClient";
...
const response = await fetchJson<EtherscanResponse<unknown>>(url.toString());
if (!response.ok) {
  throw new Error(`Request failed: ${response.status}`);
}
const data = response.data;
```

**Step 5: Run tests and commit**

Run: `npm test -- src/lib/__tests__/http-client.test.ts src/lib/__tests__/metrics.test.ts`
Expected: PASS

```bash
git add src/lib/httpClient.ts src/lib/metrics.ts src/lib/__tests__/http-client.test.ts \
  src/lib/__tests__/metrics.test.ts src/lib/fx.ts src/lib/sync.ts .env.example \
  src/app/api/metrics/route.ts

git commit -m "feat: add resilient http client and metrics"
```

---

### Task 5: Price fallback to nearby cached snapshot

**Files:**
- Create: `src/lib/prices.ts`
- Create: `src/lib/__tests__/prices-fallback.test.ts`
- Modify: `src/lib/sync.ts`
- Modify: `.env.example`

**Step 1: Write the failing test**

```ts
// src/lib/__tests__/prices-fallback.test.ts
import { describe, expect, test } from "vitest";
import { pickNearbyBucket } from "@/lib/prices";

test("pickNearbyBucket returns closest when within maxAge", () => {
  expect(pickNearbyBucket(1000, [900, 1100], 200)).toBe(900);
  expect(pickNearbyBucket(1000, [2000], 200)).toBe(null);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/__tests__/prices-fallback.test.ts`
Expected: FAIL (`pickNearbyBucket` not found)

**Step 3: Implement helper + use in sync**

```ts
// src/lib/prices.ts
export function pickNearbyBucket(target: number, buckets: number[], maxAge: number) {
  let closest: number | null = null;
  let minDiff = Number.POSITIVE_INFINITY;
  for (const bucket of buckets) {
    const diff = Math.abs(bucket - target);
    if (diff <= maxAge && diff < minDiff) {
      minDiff = diff;
      closest = bucket;
    }
  }
  return closest;
}
```

```ts
// src/lib/sync.ts
import { pickNearbyBucket } from "@/lib/prices";
...
const fallbackMaxAge = Number(process.env.PRICE_FALLBACK_MAX_AGE_SEC || 72 * 3600);
...
if (!priceUsd && !priceRub) {
  const nearby = await prisma.priceSnapshot.findMany({
    where: { tokenId: token.id },
    orderBy: { bucketTs: "desc" },
    take: 5,
  });
  const bucket = pickNearbyBucket(bucketTs, nearby.map((item) => item.bucketTs), fallbackMaxAge);
  const found = nearby.find((item) => item.bucketTs === bucket);
  if (found) {
    return { priceUsd: found.priceUsd, priceRub: found.priceRub, bucketTs };
  }
}
```

**Step 4: Run tests and commit**

Run: `npm test -- src/lib/__tests__/prices-fallback.test.ts`
Expected: PASS

```bash
git add src/lib/prices.ts src/lib/__tests__/prices-fallback.test.ts src/lib/sync.ts .env.example

git commit -m "feat: fall back to nearby cached prices"
```

---

### Task 6: Transfer pagination API + client table

**Files:**
- Create: `src/lib/pagination.ts`
- Create: `src/lib/__tests__/pagination.test.ts`
- Create: `src/app/api/transfers/route.ts`
- Create: `src/components/TransferTable.tsx`
- Modify: `src/lib/http.ts`
- Modify: `src/app/dashboard/page.tsx`

**Step 1: Write failing test**

```ts
// src/lib/__tests__/pagination.test.ts
import { describe, expect, test } from "vitest";
import { encodeCursor, decodeCursor } from "@/lib/pagination";

test("encode/decode cursor roundtrip", () => {
  const cursor = encodeCursor({ id: "t1", ts: 123 });
  const decoded = decodeCursor(cursor);
  expect(decoded).toEqual({ id: "t1", ts: 123 });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/__tests__/pagination.test.ts`
Expected: FAIL (`encodeCursor` not found)

**Step 3: Implement pagination helpers + API**

```ts
// src/lib/pagination.ts
export type TransferCursor = { id: string; ts: number };

export function encodeCursor(cursor: TransferCursor) {
  return Buffer.from(JSON.stringify(cursor)).toString("base64");
}

export function decodeCursor(raw?: string | null): TransferCursor | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
    if (!parsed?.id || typeof parsed.ts !== "number") return null;
    return { id: String(parsed.id), ts: Number(parsed.ts) };
  } catch {
    return null;
  }
}
```

```ts
// src/app/api/transfers/route.ts
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decodeCursor, encodeCursor } from "@/lib/pagination";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(10, Number(url.searchParams.get("limit") || 50)));
  const cursor = decodeCursor(url.searchParams.get("cursor"));

  const where = cursor
    ? {
        userId: session.user.id,
        OR: [
          { blockTime: { lt: new Date(cursor.ts) } },
          { blockTime: new Date(cursor.ts), id: { lt: cursor.id } },
        ],
      }
    : { userId: session.user.id };

  const transfers = await prisma.transfer.findMany({
    where,
    include: { token: true },
    orderBy: [{ blockTime: "desc" }, { id: "desc" }],
    take: limit,
  });

  const next = transfers[transfers.length - 1];
  const nextCursor = next
    ? encodeCursor({ id: next.id, ts: next.blockTime.getTime() })
    : null;

  return NextResponse.json({ ok: true, transfers, nextCursor });
}
```

```ts
// src/lib/http.ts
export async function getJson(url: string) {
  try {
    const response = await fetch(url, { method: "GET" });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, data };
  } catch {
    return { ok: false, status: 0, data: {}, error: "Network error. Check your connection." };
  }
}
```

```tsx
// src/components/TransferTable.tsx
"use client";

import { useState } from "react";
import TransferPriceOverride from "@/components/TransferPriceOverride";
import { getJson } from "@/lib/http";

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

export default function TransferTable({ initial }: { initial: TransferRow[] }) {
  const [rows, setRows] = useState(initial);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadMore = async () => {
    setLoading(true);
    const query = new URLSearchParams({ limit: "50" });
    if (cursor) query.set("cursor", cursor);
    const result = await getJson(`/api/transfers?${query.toString()}`);
    if (result.ok && Array.isArray(result.data.transfers)) {
      setRows((prev) => [...prev, ...result.data.transfers]);
      setCursor(result.data.nextCursor ?? null);
    }
    setLoading(false);
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
                    <td>{showRub && tx.priceRub ? Number(tx.priceRub).toFixed(2) : "-"}</td>
                    <td>{showRub && tx.valueRub ? Number(tx.valueRub).toFixed(2) : "-"}</td>
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
        <button className="xp-button secondary" onClick={loadMore} disabled={loading}>
          {loading ? "Загрузка..." : "Показать еще"}
        </button>
      </div>
    </div>
  );
}
```

```tsx
// src/app/dashboard/page.tsx (replace inline table)
import TransferTable from "@/components/TransferTable";
...
const transfers = await prisma.transfer.findMany({ ... take: 50, ... });
const initial = transfers.map((tx) => ({
  id: tx.id,
  txHash: tx.txHash,
  logIndex: tx.logIndex,
  blockTime: tx.blockTime.toISOString(),
  direction: tx.direction,
  amount: tx.amount.toString(),
  priceUsd: tx.priceUsd?.toString() ?? null,
  valueUsd: tx.valueUsd?.toString() ?? null,
  priceRub: tx.priceRub?.toString() ?? null,
  valueRub: tx.valueRub?.toString() ?? null,
  priceManual: tx.priceManual,
  token: { symbol: tx.token.symbol, name: tx.token.name },
}));
...
<TransferTable initial={initial} />
```

**Step 4: Run tests and commit**

Run: `npm test -- src/lib/__tests__/pagination.test.ts`
Expected: PASS

```bash
git add src/lib/pagination.ts src/lib/__tests__/pagination.test.ts \
  src/app/api/transfers/route.ts src/components/TransferTable.tsx \
  src/lib/http.ts src/app/dashboard/page.tsx

git commit -m "feat: add transfer pagination and client table"
```

---

### Task 7: Offline banner + disable actions

**Files:**
- Create: `src/hooks/useNetworkStatus.ts`
- Create: `src/components/OfflineBanner.tsx`
- Modify: `src/components/desktop/DesktopShell.tsx`
- Modify: `src/components/SyncButton.tsx`
- Modify: `src/components/BackfillButton.tsx`
- Modify: `src/components/WalletForm.tsx`
- Modify: `src/components/EtherscanForm.tsx`
- Modify: `src/components/ApiKeysForm.tsx`
- Modify: `src/components/TransferPriceOverride.tsx`
- Modify: `src/app/register/page.tsx`
- Modify: `src/app/login/page.tsx`

**Step 1: Implement hook + banner**

```ts
// src/hooks/useNetworkStatus.ts
"use client";

import { useEffect, useState } from "react";

export function useNetworkStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return online;
}
```

```tsx
// src/components/OfflineBanner.tsx
"use client";

import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export default function OfflineBanner() {
  const online = useNetworkStatus();
  if (online) return null;
  return <div className="notice">Нет соединения. Действия недоступны.</div>;
}
```

**Step 2: Use banner + disable actions**

```tsx
// src/components/desktop/DesktopShell.tsx
import OfflineBanner from "@/components/OfflineBanner";
...
<div className="desktop-root">...
  <OfflineBanner />
```

```tsx
// Example: SyncButton
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
const online = useNetworkStatus();
...
<button ... disabled={loading || !online}>
```

Apply similar `online` guard in all listed components and show a small muted hint when offline.

**Step 3: Commit**

```bash
git add src/hooks/useNetworkStatus.ts src/components/OfflineBanner.tsx \
  src/components/desktop/DesktopShell.tsx src/components/SyncButton.tsx \
  src/components/BackfillButton.tsx src/components/WalletForm.tsx \
  src/components/EtherscanForm.tsx src/components/ApiKeysForm.tsx \
  src/components/TransferPriceOverride.tsx src/app/register/page.tsx \
  src/app/login/page.tsx

git commit -m "feat: add offline banner and disable actions"
```

---

### Task 8: Health endpoint + structured logging

**Files:**
- Create: `src/lib/logger.ts`
- Create: `src/app/api/health/route.ts`
- Modify: `src/lib/sync.ts`
- Modify: `src/app/api/sync/route.ts`
- Modify: `src/app/api/prices/backfill/route.ts`

**Step 1: Add logger + health route**

```ts
// src/lib/logger.ts
type Level = "info" | "warn" | "error";

export function log(level: Level, message: string, context?: Record<string, unknown>) {
  const payload = { level, message, ...context, ts: new Date().toISOString() };
  if (process.env.NODE_ENV === "production") {
    console.log(JSON.stringify(payload));
    return;
  }
  console.log(`[${payload.level}] ${payload.message}`, context ?? "");
}
```

```ts
// src/app/api/health/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const checkDb = url.searchParams.get("db") === "1";
  if (checkDb) {
    await prisma.$queryRaw`SELECT 1`;
  }
  return NextResponse.json({ ok: true });
}
```

**Step 2: Log errors for sync/backfill**

```ts
// src/app/api/sync/route.ts
import { log } from "@/lib/logger";
...
} catch (error) {
  log("error", "sync failed", { error: error instanceof Error ? error.message : "unknown" });
  return NextResponse.json(...);
}
```

Apply similar logging in `src/app/api/prices/backfill/route.ts` and add error logging inside `fetchEtherscan` failures in `src/lib/sync.ts`.

**Step 3: Commit**

```bash
git add src/lib/logger.ts src/app/api/health/route.ts \
  src/lib/sync.ts src/app/api/sync/route.ts src/app/api/prices/backfill/route.ts

git commit -m "feat: add health check and logging"
```

---

### Task 9: DB indexes + price cleanup endpoint

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/app/api/maintenance/prune-prices/route.ts`
- Create: `src/lib/__tests__/cleanup.test.ts`
- Create: `src/lib/cleanup.ts`

**Step 1: Add cleanup helper + test**

```ts
// src/lib/__tests__/cleanup.test.ts
import { describe, expect, test } from "vitest";
import { buildPricePruneWhere } from "@/lib/cleanup";

test("buildPricePruneWhere uses cutoff", () => {
  const where = buildPricePruneWhere(1000);
  expect(where).toEqual({ bucketTs: { lt: 1000 } });
});
```

```ts
// src/lib/cleanup.ts
export function buildPricePruneWhere(cutoffTs: number) {
  return { bucketTs: { lt: cutoffTs } };
}
```

**Step 2: Add prune endpoint**

```ts
// src/app/api/maintenance/prune-prices/route.ts
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildPricePruneWhere } from "@/lib/cleanup";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const cutoff = Math.floor(Date.now() / 1000) - 365 * 24 * 3600;
  const result = await prisma.priceSnapshot.deleteMany({
    where: buildPricePruneWhere(cutoff),
  });
  return NextResponse.json({ ok: true, deleted: result.count });
}
```

**Step 3: Add indexes**

```prisma
// prisma/schema.prisma
model Transfer {
  ...
  @@index([userId, blockTime])
  @@index([userId, tokenId])
}

model PriceSnapshot {
  ...
  @@index([bucketTs])
}
```

**Step 4: Run tests + create migration**

Run: `npm test -- src/lib/__tests__/cleanup.test.ts`
Expected: PASS

Run: `npx prisma migrate dev --name hardening-indexes`
Expected: migration created

**Step 5: Commit**

```bash
git add src/lib/cleanup.ts src/lib/__tests__/cleanup.test.ts \
  src/app/api/maintenance/prune-prices/route.ts prisma/schema.prisma prisma/migrations

git commit -m "feat: add price cleanup and indexes"
```

---

### Task 10: Documentation updates

**Files:**
- Create: `docs/api.md`
- Create: `docs/ops.md`
- Modify: `README.md`

**Step 1: Add API docs**

```md
# API

## GET /api/health
Returns { ok: true }. Optional ?db=1 performs a DB ping.

## GET /api/metrics
Returns counters/timers for external HTTP calls.

## POST /api/maintenance/prune-prices
Deletes PriceSnapshot entries older than 365 days.

## GET /api/transfers
Cursor pagination. Query params: limit, cursor.
```

**Step 2: Add ops doc**

```md
# Ops

- Run DB backups via managed Postgres snapshots.
- Use /api/health for uptime checks.
- Use /api/maintenance/prune-prices for manual cleanup.
```

**Step 3: Update README**

Add env vars (`HTTP_TIMEOUT_MS`, `HTTP_RETRY_COUNT`, `HTTP_CACHE_TTL_MS`, `PRICE_FALLBACK_MAX_AGE_SEC`) and mention new endpoints.

**Step 4: Commit**

```bash
git add docs/api.md docs/ops.md README.md

git commit -m "docs: add api and ops notes"
```
