# Prisma 7 Migration Design

## Context
- Prisma 7 removes `datasource.url` from `schema.prisma` and requires `prisma.config.ts`.
- Runtime must use driver adapters (Postgres adapter in this case).
- We will use a single `DATABASE_URL` for CLI + runtime.
- The previous Docker host auto-rewrite in `src/lib/db.ts` will be removed.

## Goals
- Migrate to Prisma 7 with adapter‑pg.
- Keep a single `DATABASE_URL` for all environments.
- Make CLI commands (`generate`, `migrate`, `studio`) work with Prisma 7.
- Remove implicit host rewriting in runtime.
- Update Docker and docs to ensure correct `DATABASE_URL`.

## Non-Goals
- No schema changes or data migrations.
- No multi‑URL split (pool vs direct).

## Proposed Changes
1. **Prisma config**
   - Add `prisma.config.ts` using `defineConfig`.
   - Load environment via `import "dotenv/config";`.
   - Point to schema file and set `datasource.url` from `process.env.DATABASE_URL`.

2. **Schema**
   - Remove `url = env("DATABASE_URL")` from `prisma/schema.prisma`.

3. **Runtime client**
   - Add `pg` and `@prisma/adapter-pg` deps.
   - Create a `Pool` in `src/lib/db.ts` and pass adapter to `PrismaClient`.
   - Remove Docker host rewrite logic.

4. **Docker + docs**
   - Ensure `DATABASE_URL` in `docker-compose.yml` points to `db` host.
   - Update `.env.example` and `README.md` with explicit local vs Docker URLs.

## Validation
- `npx prisma generate`
- `npx prisma migrate dev` (or `db push`)
- `npm test`
- `npm run lint`
- `npm run build`

## Risks
- Incorrect `DATABASE_URL` will fail fast now (no auto-rewrite).
- Prisma 7 requires adapter usage; missing deps or config will break startup.
