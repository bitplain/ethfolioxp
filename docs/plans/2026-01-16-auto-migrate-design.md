# Auto Migration When Database Becomes Available

**Goal**
Start migrations automatically in the background when the database is not yet reachable, without blocking the app startup.

**Context**
The app uses Prisma + PostgreSQL. On cold start the DB may be down, so migrations should run once it becomes reachable. The app should keep responding (with 503s where DB is needed) until migrations succeed.

**Approach**
- Add a background watcher that runs `prisma migrate deploy` with retries.
- Use exponential backoff (start small, cap at 60s) to avoid hammering the DB.
- Run once per process (guarded on `globalThis`).
- Opt-out via `AUTO_MIGRATE=0`. Default enabled when `NODE_ENV` is not `test`.

**Behavior**
- On startup, the watcher begins in the background.
- If DB is unreachable, it logs and waits, then retries.
- If migrations succeed, it logs success and stops.
- If an error indicates a real migration failure (schema error, permissions), it logs and stops (no infinite loop).

**Error Handling**
- Retry only on "Can't reach database server" (Prisma error text).
- For other errors, log and stop to avoid endless failures.

**Testing**
- Unit tests for `shouldRetryMigration` and `isAutoMigrateEnabled` helpers.
- Integration is covered by existing runtime behavior; full end-to-end migration is left to deployment verification.

**Trade-offs**
- Running migrations in-app is simple and hands-free, but should be disabled if external migration tooling is used.
- Retry in background avoids blocking startup, but DB-backed APIs can still return 503 until migrations apply.
