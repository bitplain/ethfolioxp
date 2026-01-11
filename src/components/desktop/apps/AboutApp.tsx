export default function AboutApp() {
  return (
    <div className="stack">
      <div className="panel-title">About RetroDesk</div>
      <p className="muted">
        XP-десктоп для набора крипто-приложений. Синхронизирует транзакции,
        сохраняет цены и историю в SQL, работает локально и в облаке.
      </p>
      <div className="notice">
        Стек: Next.js + PostgreSQL + Prisma + Etherscan + CoinGecko.
      </div>
    </div>
  );
}
