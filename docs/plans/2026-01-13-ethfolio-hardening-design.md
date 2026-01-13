# Ethfolio Hardening Design

**Goal:** address security, reliability, performance, monitoring, and data hygiene gaps without external infrastructure.

## Scope
- Improve auth safety (password policy, brute-force protection, secret validation).
- Make external API calls resilient (timeouts, retries, fallbacks).
- Add pagination + caching and DB indexes for scale.
- Add health/metrics endpoints and structured logging.
- Add basic tests for new behavior.
- Add data cleanup for `PriceSnapshot` (manual run).

## Non-goals
- No external monitoring/alerting services.
- No full PWA offline mode.
- No deep architectural rewrite.

## Design

### Security
- Enforce password policy on register + password change (min length, character diversity, reject common patterns). Client mirrors server checks.
- Add in-memory rate limiter (per IP + per email) for credential endpoints and NextAuth authorize. Return 429 with retry-after seconds.
- Validate email format and request payload sizes to reduce abuse.
- Keep API keys encrypted at rest; detect and re-encrypt legacy plaintext values on save.
- Guard config: warn or block in production if secrets are missing or example values.

### Reliability
- Introduce a shared HTTP client with timeout + limited retries (GET only), structured errors, and response normalization.
- Add price fallback: if primary price fetch fails, try Moralis/Dexscreener; finally use nearby cached `PriceSnapshot` if within TTL.
- Standardize API error responses and surface clear user messages.
- Offline UX: detect `navigator.onLine`, show banner, and disable sync/save actions while offline.

### Performance
- Add cursor pagination endpoint for transfers (`/api/transfers`). UI adds "Load more".
- Add in-memory TTL cache for external API GETs to reduce repeated calls.
- Add DB indexes for frequent queries (`Transfer(userId, blockTime)`, `Transfer(userId, tokenId)`, `PriceSnapshot(bucketTs)`).

### Observability
- Add lightweight logger (JSON in production, readable in dev) with request-id.
- Add `GET /api/health` (fast) and `GET /api/metrics` (basic counters/timers).

### Data hygiene
- Add cleanup task for `PriceSnapshot` older than 365 days (manual endpoint or script).

### Testing
- Add unit tests for password validation, rate limiting, HTTP client retry/timeout, price fallback, and pagination.

## Rollout
- Ship as a single branch/PR.
- Provide docs for API endpoints and ops notes (backup guidance, cleanup task usage).

## Risks
- In-memory rate limiters reset on restart and do not share across instances.
- Price fallback can serve stale data; keep TTL conservative.
