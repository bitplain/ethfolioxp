# RetroDesk Performance + Rename Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Optimize rendering, data pagination, image loading, and CSS; complete the rename to RetroDesk with storage key migration.

**Architecture:** Introduce small, testable helpers for storage migration and transfer pagination. Keep UI changes minimal and focused on memoization, stable callbacks, and content-visibility to reduce re-render and paint cost.

**Tech Stack:** Next.js App Router, React 19, Prisma, Vitest, Docker Compose.

---

### Task 1: Add storage key migration helper

**Files:**
- Create: `src/lib/storage.ts`
- Test: `src/lib/__tests__/storage.test.ts`

**Step 1: Write the failing test**

```ts
import { expect, test } from "vitest";
import { migrateStorageKey } from "@/lib/storage";

test("migrateStorageKey moves old value to new key", () => {
  const storage = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => (key in store ? store[key] : null),
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
    };
  })();

  storage.setItem("ethfolio.settings", JSON.stringify({ theme: "light" }));

  const value = migrateStorageKey({
    storage,
    oldKey: "ethfolio.settings",
    newKey: "retrodesk.settings",
  });

  expect(value).toEqual({ theme: "light" });
  expect(storage.getItem("retrodesk.settings")).toBe(
    JSON.stringify({ theme: "light" })
  );
  expect(storage.getItem("ethfolio.settings")).toBe(null);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/__tests__/storage.test.ts`
Expected: FAIL (migrateStorageKey missing)

**Step 3: Write minimal implementation**

```ts
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

type MigrateArgs<T> = {
  storage: StorageLike;
  oldKey: string;
  newKey: string;
  parse?: (raw: string) => T;
  serialize?: (value: T) => string;
};

export function migrateStorageKey<T>({
  storage,
  oldKey,
  newKey,
  parse = JSON.parse,
  serialize = JSON.stringify,
}: MigrateArgs<T>): T | null {
  const raw = storage.getItem(newKey) ?? storage.getItem(oldKey);
  if (!raw) {
    return null;
  }
  const value = parse(raw) as T;
  storage.setItem(newKey, serialize(value));
  if (oldKey !== newKey) {
    storage.removeItem(oldKey);
  }
  return value;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/__tests__/storage.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/storage.ts src/lib/__tests__/storage.test.ts
git commit -m "feat: add storage key migration helper"
```

---

### Task 2: Migrate window layout storage key

**Files:**
- Modify: `src/lib/windowLayouts.ts`
- Modify: `src/lib/__tests__/window-layouts.test.ts`

**Step 1: Write the failing test**

```ts
test("loadWindowLayout migrates legacy key", () => {
  const payload = [
    {
      id: "ethfolio",
      position: { x: 120, y: 80 },
      size: { width: 760, height: 520 },
      zIndex: 101,
      isOpen: true,
      isMinimized: false,
      isMaximized: false,
    },
  ];

  window.localStorage.setItem("ethfolio.windowLayout", JSON.stringify(payload));

  const result = loadWindowLayout();

  expect(result).toEqual(payload);
  expect(window.localStorage.getItem("retrodesk.windowLayout")).toBe(
    JSON.stringify(payload)
  );
  expect(window.localStorage.getItem("ethfolio.windowLayout")).toBe(null);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/__tests__/window-layouts.test.ts`
Expected: FAIL (legacy key not migrated)

**Step 3: Write minimal implementation**

```ts
import { migrateStorageKey } from "@/lib/storage";

const LEGACY_STORAGE_KEY = "ethfolio.windowLayout";
const STORAGE_KEY = "retrodesk.windowLayout";

export function loadWindowLayout() {
  if (typeof window === "undefined") {
    return null;
  }
  return migrateStorageKey<WindowLayout[]>({
    storage: window.localStorage,
    oldKey: LEGACY_STORAGE_KEY,
    newKey: STORAGE_KEY,
  });
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/__tests__/window-layouts.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/windowLayouts.ts src/lib/__tests__/window-layouts.test.ts
git commit -m "feat: migrate window layout storage key"
```

---

### Task 3: Update settings + notepad storage keys

**Files:**
- Modify: `src/components/desktop/SettingsProvider.tsx`
- Modify: `src/components/desktop/apps/NotepadApp.tsx`

**Step 1: Confirm TDD exception for UI-only localStorage migration**

Reason: no React testing harness in repo; change is UI-side storage wiring.

**Step 2: Implement minimal change**

- Replace keys with `retrodesk.settings` and `retrodesk.notepad`.
- Call `migrateStorageKey` on first load to preserve legacy values.

**Step 3: Manual check**

- Start app, verify settings/notepad state preserved after refresh.

**Step 4: Commit**

```bash
git add src/components/desktop/SettingsProvider.tsx \
  src/components/desktop/apps/NotepadApp.tsx
git commit -m "feat: migrate settings and notepad storage keys"
```

---

### Task 4: Transfer pagination default + helper

**Files:**
- Create: `src/lib/transferPagination.ts`
- Test: `src/lib/__tests__/transfer-pagination.test.ts`
- Modify: `src/app/api/transfers/route.ts`
- Modify: `src/components/TransferTable.tsx`

**Step 1: Write the failing test**

```ts
import { expect, test } from "vitest";
import { getTransferLimit, DEFAULT_TRANSFER_LIMIT } from "@/lib/transferPagination";

test("getTransferLimit uses default when missing", () => {
  const params = new URLSearchParams();
  expect(getTransferLimit(params)).toBe(DEFAULT_TRANSFER_LIMIT);
});

test("getTransferLimit clamps to min/max", () => {
  expect(getTransferLimit(new URLSearchParams({ limit: "5" }))).toBe(10);
  expect(getTransferLimit(new URLSearchParams({ limit: "250" }))).toBe(100);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/__tests__/transfer-pagination.test.ts`
Expected: FAIL (module missing)

**Step 3: Write minimal implementation**

```ts
export const DEFAULT_TRANSFER_LIMIT = 20;
export const MIN_TRANSFER_LIMIT = 10;
export const MAX_TRANSFER_LIMIT = 100;

export function getTransferLimit(params: URLSearchParams) {
  const raw = Number(params.get("limit") || DEFAULT_TRANSFER_LIMIT);
  return Math.min(MAX_TRANSFER_LIMIT, Math.max(MIN_TRANSFER_LIMIT, raw));
}
```

**Step 4: Update API + client**

- In `route.ts`, replace inline Math.min/Math.max with `getTransferLimit(url.searchParams)`.
- In `TransferTable`, use `DEFAULT_TRANSFER_LIMIT` in query params.

**Step 5: Run test to verify it passes**

Run: `npm test -- src/lib/__tests__/transfer-pagination.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/lib/transferPagination.ts src/lib/__tests__/transfer-pagination.test.ts \
  src/app/api/transfers/route.ts src/components/TransferTable.tsx
git commit -m "feat: lower transfer page size to 20"
```

---

### Task 5: Idle prefetch for transfers

**Files:**
- Create: `src/lib/idle.ts`
- Test: `src/lib/__tests__/idle.test.ts`
- Modify: `src/components/TransferTable.tsx`

**Step 1: Write the failing test**

```ts
import { expect, test, vi } from "vitest";
import { scheduleIdle } from "@/lib/idle";

test("scheduleIdle falls back to setTimeout", () => {
  vi.useFakeTimers();
  const callback = vi.fn();
  const cancel = scheduleIdle(callback, { timeoutMs: 10 });

  vi.advanceTimersByTime(10);
  expect(callback).toHaveBeenCalledTimes(1);

  cancel();
  vi.useRealTimers();
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/__tests__/idle.test.ts`
Expected: FAIL (module missing)

**Step 3: Write minimal implementation**

```ts
type IdleOptions = { timeoutMs?: number };

export function scheduleIdle(callback: () => void, options: IdleOptions = {}) {
  if (typeof window === "undefined") {
    return () => {};
  }

  if ("requestIdleCallback" in window) {
    const id = window.requestIdleCallback(() => callback(), {
      timeout: options.timeoutMs,
    });
    return () => window.cancelIdleCallback(id);
  }

  const timeout = window.setTimeout(callback, options.timeoutMs ?? 1000);
  return () => window.clearTimeout(timeout);
}
```

**Step 4: Update TransferTable**

- Add a `prefetchRef` to store `{ cursor, transfers, nextCursor }`.
- On idle (via `scheduleIdle`), if `cursor` exists and no prefetched data for it,
  fetch the next page and store it in `prefetchRef`.
- `loadMore` should consume prefetched data first, else fetch on demand.

**Step 5: Run test to verify it passes**

Run: `npm test -- src/lib/__tests__/idle.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/lib/idle.ts src/lib/__tests__/idle.test.ts src/components/TransferTable.tsx
git commit -m "feat: idle prefetch transfer pages"
```

---

### Task 6: Window rendering performance (memoization)

**Files:**
- Modify: `src/components/desktop/DesktopShell.tsx`
- Modify: `src/components/desktop/Window.tsx`
- Modify: `src/components/desktop/Taskbar.tsx`
- Modify: `src/components/desktop/StartMenu.tsx`
- Modify: `src/components/desktop/DesktopIcons.tsx`
- Modify: `src/components/TransferTable.tsx`

**Step 1: Confirm TDD exception for UI memoization**

Reason: no React testing harness in repo; change is render optimization only.

**Step 2: Implement minimal change**

- Wrap components in `React.memo`.
- Convert handlers/derived arrays in `DesktopShell` to `useCallback` / `useMemo`.
- Avoid no-op `setWindows` updates (return previous state when unchanged).

**Step 3: Manual check**

- Open Desktop, drag/resize windows, toggle Start, load transfers.

**Step 4: Commit**

```bash
git add src/components/desktop/DesktopShell.tsx \
  src/components/desktop/Window.tsx \
  src/components/desktop/Taskbar.tsx \
  src/components/desktop/StartMenu.tsx \
  src/components/desktop/DesktopIcons.tsx \
  src/components/TransferTable.tsx
git commit -m "perf: memoize desktop UI components"
```

---

### Task 7: Image optimization

**Files:**
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/register/page.tsx`
- Modify: `src/components/desktop/Taskbar.tsx`
- Modify: `src/app/globals.css`

**Step 1: Confirm TDD exception for UI image swaps**

Reason: no React testing harness in repo; change is visual optimization only.

**Step 2: Implement minimal change**

- Replace inline icon spans with `next/image` where sizes are known.
- For CSS background icons, add `image-set()` with WebP/AVIF.
- Keep layout and XP styling unchanged.

**Step 3: Manual check**

- Verify login/register icons and tray avatar render.

**Step 4: Commit**

```bash
git add src/app/login/page.tsx src/app/register/page.tsx \
  src/components/desktop/Taskbar.tsx src/app/globals.css
git commit -m "perf: optimize image loading"
```

---

### Task 8: CSS render optimizations

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Confirm TDD exception for CSS-only changes**

Reason: no CSS test harness in repo.

**Step 2: Implement minimal change**

- Add `content-visibility: auto` and `contain-intrinsic-size` to window and
  table containers.
- Reduce heavy effects where they are most expensive (e.g. large box-shadows).

**Step 3: Manual check**

- Scroll transfer table, open/close windows, ensure visuals still match XP look.

**Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "perf: add content-visibility for windows/table"
```

---

### Task 9: Project rename + docs

**Files:**
- Modify: `package.json`
- Modify: `docker-compose.yml`
- Modify: `README.md`
- Search/modify: strings referencing old project name where appropriate

**Step 1: Confirm TDD exception for config/doc changes**

Reason: documentation and metadata updates.

**Step 2: Implement minimal change**

- Update package name to `retrodesk`.
- Rename Docker container names to `retrodesk-*`.
- Update README branding and references.

**Step 3: Commit**

```bash
git add package.json docker-compose.yml README.md
git commit -m "chore: rename project to retrodesk"
```

---

### Task 10: Full verification

**Step 1: Run unit tests**

Run: `npm test`
Expected: PASS

**Step 2: Build**

Run: `npm run build`
Expected: PASS

**Step 3: Docker compose**

Run: `docker-compose up --build`
Expected: containers start for `db` and `web` without errors

**Step 4: Report results**

- Note test/build output summary and any warnings.

