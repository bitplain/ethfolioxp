# API

## GET /api/health
Returns `{ ok: true }`. Optional `?db=1` performs a DB ping.

## GET /api/metrics
Returns counters/timers for external HTTP calls.

## POST /api/maintenance/prune-prices
Deletes `PriceSnapshot` entries older than 365 days.

## GET /api/transfers
Cursor pagination. Query params: `limit`, `cursor`.
