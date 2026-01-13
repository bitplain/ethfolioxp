# Prisma 7 Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate to Prisma 7 with the Postgres driver adapter, remove schema URL usage, and align Docker/docs with a single `DATABASE_URL`.

**Architecture:** Prisma CLI will read `DATABASE_URL` from `prisma.config.ts`; runtime uses `@prisma/adapter-pg` with `pg` Pool in `src/lib/db.ts`. Docker and docs are updated to ensure a correct `DATABASE_URL` in each environment.

**Tech Stack:** Prisma 7, @prisma/adapter-pg, pg, Next.js, TypeScript, Docker Compose

---

### Task 1: Upgrade Prisma dependencies and add adapter packages

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

**Step 1: Update dependency versions**

Update `package.json`:

```json
{
  "dependencies": {
    "@prisma/client": "^7.2.0",
    "@prisma/adapter-pg": "^7.2.0",
    "pg": "^8.12.0"
  },
  "devDependencies": {
    "prisma": "^7.2.0"
  }
}
```

**Step 2: Install**

Run: `npm install`

Expected: `package-lock.json` updated, install succeeds.

**Step 3: Confirm Prisma 7 enforces config**

Run: `npx prisma generate`

Expected: FAIL with error that `datasource.url` in `schema.prisma` is no longer supported.

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: upgrade prisma and add pg adapter"
```

---

### Task 2: Add prisma.config.ts and remove schema url

**Files:**
- Create: `prisma.config.ts`
- Modify: `prisma/schema.prisma`

**Step 1: Create prisma.config.ts**

```ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
```

**Step 2: Remove url from schema**

Update `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
}
```

**Step 3: Re-run prisma generate**

Run: `npx prisma generate`

Expected: PASS and Prisma Client generated.

**Step 4: Commit**

```bash
git add prisma.config.ts prisma/schema.prisma
git commit -m "chore: add prisma config and remove schema url"
```

---

### Task 3: Update runtime Prisma client to use adapter-pg

**Files:**
- Create: `src/lib/db-url.ts`
- Modify: `src/lib/db.ts`
- Test: `src/lib/__tests__/db-url.test.ts`

**Step 1: Write failing test for DATABASE_URL guard**

Create `src/lib/__tests__/db-url.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { getDatabaseUrl } from "../db-url";

describe("getDatabaseUrl", () => {
  it("throws when DATABASE_URL is missing", () => {
    vi.stubEnv("DATABASE_URL", undefined);
    expect(() => getDatabaseUrl()).toThrow("DATABASE_URL is required");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test src/lib/__tests__/db-url.test.ts`

Expected: FAIL because `getDatabaseUrl` does not exist yet.

**Step 3: Implement db-url helper**

Create `src/lib/db-url.ts`:

```ts
export function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }
  return databaseUrl;
}
```

**Step 4: Update db.ts to use adapter-pg**

Update `src/lib/db.ts`:

```ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { getDatabaseUrl } from "./db-url";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

const databaseUrl = getDatabaseUrl();
const pool = globalForPrisma.pgPool ?? new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pgPool = pool;
}
```

**Step 5: Re-run test**

Run: `npm test src/lib/__tests__/db-url.test.ts`

Expected: PASS.

**Step 6: Commit**

```bash
git add src/lib/db-url.ts src/lib/db.ts src/lib/__tests__/db-url.test.ts
git commit -m "feat: switch prisma runtime to adapter-pg"
```

---

### Task 4: Align Docker and environment docs

**Files:**
- Modify: `docker-compose.yml`
- Modify: `.env.example`
- Modify: `README.md`

**Step 1: Update docker-compose to single DATABASE_URL**

Set:

```yaml
DATABASE_URL: ${DATABASE_URL:-postgresql://postgres:postgres@db:5432/portfolio}
```

**Step 2: Update .env.example with explicit guidance**

Add a short comment showing Docker vs local host, and keep one `DATABASE_URL`.

**Step 3: Update README**

Document that `DATABASE_URL` must point to `db` inside Docker and `localhost` outside.

**Step 4: Commit**

```bash
git add docker-compose.yml .env.example README.md
git commit -m "docs: clarify DATABASE_URL for prisma 7"
```

---

### Task 5: Verification

**Files:**
- None

**Step 1: Prisma checks**

Run: `npx prisma generate`  
Run: `npx prisma migrate dev` (or `npx prisma db push` if migrations are not desired)

Expected: PASS.

**Step 2: Test/lint/build**

Run: `npm test`  
Run: `npm run lint`  
Run: `npm run build`

Expected: PASS (lint may report existing warnings only).

**Step 3: Commit verification notes (optional)**

No commit required unless documentation updates are needed.
