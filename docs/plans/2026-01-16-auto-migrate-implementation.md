# Auto Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Run Prisma migrations automatically in the background once the DB becomes reachable.

**Architecture:** Add a migration watcher helper with retries and backoff; start it from `src/lib/db.ts` during app boot.

**Tech Stack:** Next.js App Router, Prisma 7, PostgreSQL, Vitest.

---

### Task 0: Prepare branch

**Files:**
- Modify: none

**Step 1: Confirm branch**

Run: `git status -sb`
Expected: On `stabilize-critical` with no staged changes

---

### Task 1: Test retry helpers

**Files:**
- Create: `src/lib/__tests__/migrate.test.ts`

**Step 1: Write failing tests**

```ts
import { describe, expect, it, vi } from "vitest";
import { isAutoMigrateEnabled, shouldRetryMigration } from "../migrate";

describe("shouldRetryMigration", () => {
  it("returns true for unreachable database error", () => {
    expect(shouldRetryMigration("Can't reach database server at `db:5432`")).toBe(true);
  });

  it("returns false for other errors", () => {
    expect(shouldRetryMigration("permission denied")).toBe(false);
  });
});

describe("isAutoMigrateEnabled", () => {
  it("is disabled when AUTO_MIGRATE=0", () => {
    vi.stubEnv("AUTO_MIGRATE", "0");
    vi.stubEnv("NODE_ENV", "production");
    expect(isAutoMigrateEnabled()).toBe(false);
  });

  it("is enabled by default", () => {
    vi.stubEnv("AUTO_MIGRATE", undefined);
    vi.stubEnv("NODE_ENV", "production");
    expect(isAutoMigrateEnabled()).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `./node_modules/.bin/vitest run src/lib/__tests__/migrate.test.ts --reporter dot --pool=threads`
Expected: FAIL (missing module)

---

### Task 2: Implement migration watcher

**Files:**
- Create: `src/lib/migrate.ts`

**Step 1: Implement minimal helpers**

```ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { log } from "./logger";

const execFileAsync = promisify(execFile);

const globalForMigrate = globalThis as unknown as {
  autoMigrateStarted?: boolean;
};

export function shouldRetryMigration(message: string) {
  return message.includes("Can't reach database server");
}

export function isAutoMigrateEnabled() {
  if (process.env.NODE_ENV === "test") {
    return false;
  }
  return process.env.AUTO_MIGRATE !== "0";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error ?? "unknown error");
}

export function startMigrationWatcher() {
  if (!isAutoMigrateEnabled()) {
    return;
  }
  if (globalForMigrate.autoMigrateStarted) {
    return;
  }
  globalForMigrate.autoMigrateStarted = true;

  void (async () => {
    let delayMs = 2000;
    while (true) {
      try {
        await execFileAsync("npx", ["prisma", "migrate", "deploy"], {
          env: { ...process.env },
        });
        log("info", "migrations applied");
        return;
      } catch (error) {
        const message = extractErrorMessage(error);
        if (!shouldRetryMigration(message)) {
          log("error", "migration failed", { error: message });
          return;
        }
        log("warn", "migration retry", { error: message, delayMs });
        await sleep(delayMs);
        delayMs = Math.min(delayMs * 2, 60_000);
      }
    }
  })();
}
```

**Step 2: Run test to verify it passes**

Run: `./node_modules/.bin/vitest run src/lib/__tests__/migrate.test.ts --reporter dot --pool=threads`
Expected: PASS

**Step 3: Commit**

```bash
git add src/lib/migrate.ts src/lib/__tests__/migrate.test.ts
git commit -m "feat: add auto-migrate watcher"
```

---

### Task 3: Start watcher on app boot

**Files:**
- Modify: `src/lib/db.ts`

**Step 1: Start watcher**

```ts
import { startMigrationWatcher } from "./migrate";

startMigrationWatcher();
```

Place after Prisma client initialization.

**Step 2: Commit**

```bash
git add src/lib/db.ts
git commit -m "feat: start migration watcher"
```

---

### Task 4: Verification

**Files:**
- Modify: none

**Step 1: Run tests**

Run:
```bash
./node_modules/.bin/vitest run src/lib/__tests__/migrate.test.ts --reporter dot --pool=threads
```
Expected: PASS
