export default function AboutApp() {
  return (
    <div className="stack">
      <div className="panel-title">About Ethfolio</div>
      <p className="muted">
        XP-десктоп для портфеля ETH. Синхронизирует транзакции из блокчейна,
        сохраняет цены и историю в SQL, работает локально и в облаке.
      </p>
      <div className="notice">
        Стек: Next.js + PostgreSQL + Prisma + Etherscan + CoinGecko.
      </div>
    </div>
  );
}
