# Ethfolio Product Specification

**Purpose**
Ethfolio is a personal ETH portfolio tracker for a single admin user. It syncs ETH transfers manually from Etherscan, shows a clean history of transactions, and provides current value with basic historical performance.

**Target User**
One owner who wants a simple, self-hosted view of their ETH holdings without ERC-20, NFT, or exchange integrations.

**Goals**
- Sign up and log in with email and password.
- Store a single ETH wallet address and Etherscan API key in settings.
- Manually sync transfers and persist them in a database.
- View transfers in a table with pagination and basic filters.
- See current ETH balance, price, and total portfolio value.
- See a simple historical price chart and approximate P/L for common periods.

**Non-Goals**
- ERC-20 or NFT tracking.
- Multiple wallets or multiple user roles.
- Automatic background sync.
- Advanced tax reporting or exports.
- Real-time price streaming.

**Core Features**
1. **Authentication**
   - Email/password login for a single admin user.
   - Auth required for dashboard, settings, and sync actions.
2. **Settings**
   - Save ETH wallet address and Etherscan API key.
   - Validate address format and key presence before sync.
3. **Manual Sync**
   - "Sync" button triggers Etherscan transfer fetch.
   - Idempotent import to avoid duplicates.
   - Surface progress and errors; keep last successful sync timestamp.
4. **Transfers Table**
   - Columns: timestamp, direction (in/out), amount, fee, tx hash, block.
   - Filters: date range and direction; pagination for long histories.
   - Link to Etherscan for each tx hash.
5. **Portfolio Value**
   - Current ETH balance, price, and total value in fiat.
   - Show last price update timestamp.
6. **Historical Chart + P/L**
   - Store price history in fixed buckets (e.g., hourly).
   - Chart price over time.
   - P/L is approximate: (current price - period start price) * current balance.
7. **Ops Utilities**
   - Health endpoint and basic metrics.
   - Manual cleanup of old price buckets.

**User Flow**
1. User registers and logs in.
2. User opens Settings and saves wallet + API key.
3. User clicks Sync and waits for completion.
4. User views dashboard metrics and transfer history.

**Data & Integrations**
- **Etherscan v2** for ETH transfer history.
- **Price provider** (e.g., CoinGecko) for ETH price history.
- **Database** (Postgres) stores users, settings, transfers, and prices.

**Error Handling**
- Invalid API key or wallet: block sync with a clear message.
- External API timeouts: show error, retry manually later.
- Partial failures: preserve existing data and show last successful sync.

**Security & Privacy**
- Store secrets in the database with server-side access only.
- Protect all routes with authentication.
- No public sharing or multi-user access in this phase.

**Success Criteria**
- A new admin can sign up, configure settings, and sync transfers.
- Dashboard shows current value and a historical chart.
- Transfers table loads with filters and links.
- All errors are visible and do not corrupt existing data.
