# Balance + Sync + UI Reliability Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix portfolio balance aggregation, add Etherscan pagination/backfill cursoring, and make UI requests resilient with debounced layout persistence.

**Architecture:** Move aggregation/pagination/cursor logic into small, testable helpers. Use Prisma groupBy for full-history balances and keep the last-50 table unchanged. Introduce a shared POST helper for client fetches and a debounced saver for window layout writes.

**Tech Stack:** Next.js App Router, Prisma, NextAuth, React, Vitest.

---

### Task 1: Add test runner (Vitest)

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`
- Create: `vitest.config.ts`

**Step 1: Add Vitest config**

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
  },
});
```

**Step 2: Add dev dependency + test script**

```json
// package.json (scripts + devDependencies)
{
  "scripts": {
    "test": "vitest run"
  },
  "devDependencies": {
    "vitest": "^2.0.0"
  }
}
```

**Step 3: Add Vitest types**

```json
// tsconfig.json (compilerOptions.types)
{
  "types": ["node", "vitest/globals"]
}
```

**Step 4: Run tests to confirm harness**

Run: `npm test`
Expected: PASS (no tests found or 0 tests run).

**Step 5: Commit**

```bash
git add package.json tsconfig.json vitest.config.ts
git commit -m "chore: add vitest test runner"
```

---

### Task 2: Full-history holdings aggregation

**Files:**
- Create: `src/lib/holdings.ts`
- Create: `src/lib/__tests__/holdings.test.ts`
- Modify: `src/app/dashboard/page.tsx`

**Step 1: Write failing test**

```ts
// src/lib/__tests__/holdings.test.ts
import { Prisma } from "@prisma/client";
import { buildHoldings } from "@/lib/holdings";

test("buildHoldings nets IN and OUT per token and filters zeroes", () => {
  const groups = [
    { tokenId: "t1", direction: "IN", _sum: { amount: new Prisma.Decimal("2") } },
    { tokenId: "t1", direction: "OUT", _sum: { amount: new Prisma.Decimal("1.5") } },
    { tokenId: "t2", direction: "OUT", _sum: { amount: new Prisma.Decimal("5") } },
    { tokenId: "t2", direction: "IN", _sum: { amount: new Prisma.Decimal("5") } },
  ];
  const tokens = [
    { id: "t1", symbol: "AAA", name: "Token A" },
    { id: "t2", symbol: "BBB", name: "Token B" },
  ];

  const holdings = buildHoldings(groups, tokens);

  expect(holdings).toHaveLength(1);
  expect(holdings[0].token.id).toBe("t1");
  expect(holdings[0].amount.toString()).toBe("0.5");
});
```

**Step 2: Run test to verify failure**

Run: `npm test -- src/lib/__tests__/holdings.test.ts`
Expected: FAIL (`buildHoldings` not found).

**Step 3: Implement minimal helper**

```ts
// src/lib/holdings.ts
import { Prisma } from "@prisma/client";

type Group = {
  tokenId: string;
  direction: "IN" | "OUT";
  _sum: { amount: Prisma.Decimal | null };
};

type Token = { id: string; symbol: string; name: string };

type Holding = { token: Token; amount: Prisma.Decimal };

export function buildHoldings(groups: Group[], tokens: Token[]): Holding[] {
  const tokenMap = new Map(tokens.map((token) => [token.id, token]));
  const totals = new Map<string, Prisma.Decimal>();

  for (const group of groups) {
    if (!group._sum.amount) {
      continue;
    }
    const signed =
      group.direction === "IN" ? group._sum.amount : group._sum.amount.mul(-1);
    const current = totals.get(group.tokenId) ?? new Prisma.Decimal(0);
    totals.set(group.tokenId, current.add(signed));
  }

  return Array.from(totals.entries())
    .map(([tokenId, amount]) => {
      const token = tokenMap.get(tokenId);
      if (!token) {
        return null;
      }
      return { token, amount };
    })
    .filter((item): item is Holding => Boolean(item))
    .filter((item) => item.amount.abs().greaterThan(0));
}
```

**Step 4: Update dashboard query + usage**

```ts
// src/app/dashboard/page.tsx (new data fetch + buildHoldings usage)
import { Prisma } from "@prisma/client";
import { buildHoldings } from "@/lib/holdings";

const [wallet, settings, transfers, groupedTotals] = await Promise.all([
  prisma.wallet.findFirst({ where: { userId: session.user.id } }),
  getUserSettings(session.user.id),
  prisma.transfer.findMany({ /* last 50 list */ }),
  prisma.transfer.groupBy({
    by: ["tokenId", "direction"],
    where: { userId: session.user.id },
    _sum: { amount: true },
  }),
]);

const tokenIds = Array.from(new Set(groupedTotals.map((group) => group.tokenId)));
const tokens = tokenIds.length
  ? await prisma.token.findMany({ where: { id: { in: tokenIds } } })
  : [];

const holdings = buildHoldings(groupedTotals, tokens);
```

**Step 5: Run tests**

Run: `npm test -- src/lib/__tests__/holdings.test.ts`
Expected: PASS.

**Step 6: Commit**

```bash
git add src/lib/holdings.ts src/lib/__tests__/holdings.test.ts src/app/dashboard/page.tsx
git commit -m "fix: compute holdings across full transfer history"
```

---

### Task 3: Paginate Etherscan sync

**Files:**
- Create: `src/lib/__tests__/etherscan-pagination.test.ts`
- Modify: `src/lib/sync.ts`

**Step 1: Write failing test**

```ts
// src/lib/__tests__/etherscan-pagination.test.ts
import { fetchEtherscanPaginated } from "@/lib/sync";

test("fetchEtherscanPaginated paginates until short page", async () => {
  const calls: number[] = [];
  const fetchPage = async (params: URLSearchParams) => {
    calls.push(Number(params.get("page")));
    const page = Number(params.get("page"));
    if (page === 1) return ["a", "b"];
    if (page === 2) return ["c"];
    return [];
  };

  const result = await fetchEtherscanPaginated(
    new URLSearchParams({ module: "account", action: "txlist" }),
    "api-key",
    { pageSize: 2, maxPages: 5, fetchPage }
  );

  expect(result).toEqual(["a", "b", "c"]);
  expect(calls).toEqual([1, 2]);
});
```

**Step 2: Run test to verify failure**

Run: `npm test -- src/lib/__tests__/etherscan-pagination.test.ts`
Expected: FAIL (`fetchEtherscanPaginated` not found).

**Step 3: Implement helper + use in sync**

```ts
// src/lib/sync.ts (add env defaults + helper)
const ETHERSCAN_PAGE_SIZE = Math.max(1, Number(process.env.ETHERSCAN_PAGE_SIZE || 100));
const ETHERSCAN_MAX_PAGES = Math.max(1, Number(process.env.ETHERSCAN_MAX_PAGES || 20));

export async function fetchEtherscanPaginated<T>(
  params: URLSearchParams,
  apiKey: string,
  options?: {
    pageSize?: number;
    maxPages?: number;
    fetchPage?: (params: URLSearchParams, apiKey: string) => Promise<T[]>;
  }
): Promise<T[]> {
  const pageSize = options?.pageSize ?? ETHERSCAN_PAGE_SIZE;
  const maxPages = options?.maxPages ?? ETHERSCAN_MAX_PAGES;
  const fetchPage = options?.fetchPage ?? fetchEtherscan;
  const results: T[] = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const pageParams = new URLSearchParams(params);
    pageParams.set("page", String(page));
    pageParams.set("offset", String(pageSize));
    const chunk = await fetchPage(pageParams, apiKey);
    results.push(...chunk);
    if (chunk.length < pageSize) {
      break;
    }
  }

  return results;
}
```

```ts
// src/lib/sync.ts (syncWallet: use pagination helper)
const [ethTxs, tokenTxs] = await Promise.all([
  fetchEtherscanPaginated<EtherscanTx>(
    new URLSearchParams({ module: "account", action: "txlist", address, sort: "asc" }),
    apiKey
  ),
  fetchEtherscanPaginated<EtherscanTokenTx>(
    new URLSearchParams({ module: "account", action: "tokentx", address, sort: "asc" }),
    apiKey
  ),
]);
```

**Step 4: Run tests**

Run: `npm test -- src/lib/__tests__/etherscan-pagination.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/sync.ts src/lib/__tests__/etherscan-pagination.test.ts
git commit -m "feat: paginate etherscan sync requests"
```

---

### Task 4: Backfill cursor scan (no early stop)

**Files:**
- Create: `src/lib/__tests__/backfill-cursor.test.ts`
- Create: `src/lib/backfill.ts`
- Modify: `src/lib/sync.ts`

**Step 1: Write failing test**

```ts
// src/lib/__tests__/backfill-cursor.test.ts
import { buildBackfillWhere } from "@/lib/backfill";

test("buildBackfillWhere adds cursor filter when provided", () => {
  const base = buildBackfillWhere("user-1", null);
  const withCursor = buildBackfillWhere("user-1", "cursor-id");

  expect(base).toMatchObject({ userId: "user-1" });
  expect(withCursor).toMatchObject({ userId: "user-1", id: { gt: "cursor-id" } });
});
```

**Step 2: Run test to verify failure**

Run: `npm test -- src/lib/__tests__/backfill-cursor.test.ts`
Expected: FAIL (`buildBackfillWhere` not found).

**Step 3: Implement helper + update backfill loop**

```ts
// src/lib/backfill.ts
export function buildBackfillWhere(userId: string, cursorId: string | null) {
  return {
    userId,
    priceManual: false,
    OR: [{ priceUsd: null }, { priceRub: null }],
    ...(cursorId ? { id: { gt: cursorId } } : {}),
  };
}
```

```ts
// src/lib/sync.ts (backfillMissingPrices)
let cursorId: string | null = null;

while (batches < BACKFILL_MAX_BATCHES) {
  const transfers = await prisma.transfer.findMany({
    where: buildBackfillWhere(userId, cursorId),
    include: { token: true },
    orderBy: { id: "asc" },
    take: BACKFILL_BATCH_SIZE,
  });

  if (!transfers.length) {
    break;
  }

  cursorId = transfers[transfers.length - 1].id;
  // keep scanning even if updated == 0
  batches += 1;
}
```

**Step 4: Run tests**

Run: `npm test -- src/lib/__tests__/backfill-cursor.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/backfill.ts src/lib/__tests__/backfill-cursor.test.ts src/lib/sync.ts
git commit -m "fix: keep backfill scanning with cursor"
```

---

### Task 5: UI network errors + debounced layout save

**Files:**
- Create: `src/lib/__tests__/http.test.ts`
- Create: `src/lib/__tests__/debounce.test.ts`
- Create: `src/lib/http.ts`
- Create: `src/lib/debounce.ts`
- Modify: `src/components/SyncButton.tsx`
- Modify: `src/components/BackfillButton.tsx`
- Modify: `src/components/ApiKeysForm.tsx`
- Modify: `src/components/EtherscanForm.tsx`
- Modify: `src/components/WalletForm.tsx`
- Modify: `src/components/TransferPriceOverride.tsx`
- Modify: `src/app/register/page.tsx`
- Modify: `src/app/login/page.tsx`
- Modify: `src/components/desktop/DesktopShell.tsx`

**Step 1: Write failing tests**

```ts
// src/lib/__tests__/http.test.ts
import { postJson } from "@/lib/http";
import { vi } from "vitest";

test("postJson returns ok false on network error", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

  const result = await postJson("/api/test", { a: 1 });

  expect(result.ok).toBe(false);
  expect(result.error).toContain("Network");
});
```

```ts
// src/lib/__tests__/debounce.test.ts
import { debounce } from "@/lib/debounce";
import { vi } from "vitest";

test("debounce calls once with last args", () => {
  vi.useFakeTimers();
  const fn = vi.fn();
  const debounced = debounce(fn, 200);

  debounced("first");
  debounced("second");

  vi.advanceTimersByTime(199);
  expect(fn).not.toHaveBeenCalled();

  vi.advanceTimersByTime(1);
  expect(fn).toHaveBeenCalledTimes(1);
  expect(fn).toHaveBeenCalledWith("second");

  debounced.cancel();
  vi.useRealTimers();
});
```

**Step 2: Run tests to verify failure**

Run: `npm test -- src/lib/__tests__/http.test.ts src/lib/__tests__/debounce.test.ts`
Expected: FAIL (`postJson`/`debounce` not found).

**Step 3: Implement helpers**

```ts
// src/lib/http.ts
export async function postJson(url: string, body?: unknown) {
  const headers: Record<string, string> = {};
  const init: RequestInit = { method: "POST", headers };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, init);
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, data };
  } catch {
    return { ok: false, status: 0, data: {}, error: "Network error. Проверь соединение." };
  }
}
```

```ts
// src/lib/debounce.ts
export function debounce<T extends (...args: any[]) => void>(fn: T, delayMs: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      timeout = null;
      fn(...args);
    }, delayMs);
  };

  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  return debounced;
}
```

**Step 4: Update UI calls to use postJson + finally**

```ts
// Example: src/components/SyncButton.tsx
const onSync = async () => {
  playSound("click");
  setLoading(true);
  setMessage(null);

  const result = await postJson("/api/sync");
  if (!result.ok) {
    setMessage(result.data.error || result.error || "Ошибка синхронизации");
    setLoading(false);
    return;
  }

  playSound("notify");
  setMessage(`Синхронизировано: +${result.data.created} записей.`);
  setLoading(false);
};
```

```ts
// Example: src/components/desktop/DesktopShell.tsx (debounced save)
const saveLayout = useMemo(() => debounce(saveWindowLayout, 250), []);

useEffect(() => {
  const payload = windows.map((item) => ({
    id: item.id,
    position: item.position,
    size: item.size,
    zIndex: item.zIndex,
    isOpen: item.isOpen,
    isMinimized: item.isMinimized,
    isMaximized: item.isMaximized,
  }));
  saveLayout(payload);
  return () => saveLayout.cancel();
}, [saveLayout, windows]);
```

**Step 5: Run tests**

Run: `npm test -- src/lib/__tests__/http.test.ts src/lib/__tests__/debounce.test.ts`
Expected: PASS.

**Step 6: Commit**

```bash
git add src/lib/http.ts src/lib/debounce.ts src/lib/__tests__/http.test.ts src/lib/__tests__/debounce.test.ts \
  src/components/SyncButton.tsx src/components/BackfillButton.tsx src/components/ApiKeysForm.tsx \
  src/components/EtherscanForm.tsx src/components/WalletForm.tsx src/components/TransferPriceOverride.tsx \
  src/app/register/page.tsx src/app/login/page.tsx src/components/desktop/DesktopShell.tsx

git commit -m "fix: handle network errors and debounce layout save"
```

---

Plan complete and saved to `docs/plans/2026-01-11-balance-sync-ui-improvements.md`. Two execution options:

1. Subagent-Driven (this session) - I dispatch fresh subagent per task, review between tasks, fast iteration
2. Parallel Session (separate) - Open new session with executing-plans, batch execution with checkpoints

Which approach?
