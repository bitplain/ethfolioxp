import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import DesktopShell from "@/components/desktop/DesktopShell";
import EtherscanForm from "@/components/EtherscanForm";
import SyncButton from "@/components/SyncButton";
import WalletForm from "@/components/WalletForm";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const [wallet, settings, transfers] = await Promise.all([
    prisma.wallet.findFirst({ where: { userId: session.user.id } }),
    prisma.userSettings.findUnique({ where: { userId: session.user.id } }),
    prisma.transfer.findMany({
      where: { userId: session.user.id },
      include: { token: true },
      orderBy: { blockTime: "desc" },
      take: 50,
    }),
  ]);

  const totals = new Map<
    string,
    {
      token: (typeof transfers)[number]["token"];
      amount: (typeof transfers)[number]["amount"];
    }
  >();

  for (const transfer of transfers) {
    const existing = totals.get(transfer.tokenId) ?? {
      token: transfer.token,
      amount: transfer.amount.mul(0),
    };
    const delta =
      transfer.direction === "IN"
        ? transfer.amount
        : transfer.amount.mul(-1);
    existing.amount = existing.amount.add(delta);
    totals.set(transfer.tokenId, existing);
  }

  const holdings = Array.from(totals.values()).filter((item) =>
    item.amount.abs().greaterThan(0)
  );

  const lastSync = transfers[0]?.blockTime;

  return (
    <DesktopShell
      mainId="ethfolio"
      mainTitle="Ethfolio"
      mainSubtitle="Портфель и транзакции"
      mainDefaultOpen={false}
      mainCanClose
      extraWindows={[
        {
          id: "sync",
          title: "Sync Center",
          subtitle: "Синхронизация кошелька",
          content: (
            <div className="stack">
              <div className="notice">
                {wallet?.address ? "Адрес сохранен" : "Адрес не задан"}
                {lastSync ? (
                  <span className="muted">
                    {" "}Последняя операция: {lastSync.toLocaleString("ru-RU")}
                  </span>
                ) : null}
              </div>
              <div className="panel">
                <div className="panel-title">Синхронизация</div>
                <p className="muted">
                  Обнови историю транзакций и цен в один клик.
                </p>
                <SyncButton />
              </div>
            </div>
          ),
        },
        {
          id: "settings",
          title: "Settings",
          subtitle: "Кошелек и интерфейс",
          content: (
            <div className="stack">
              <p className="muted">
                Вставь ETH‑адрес. Он нужен для синхронизации транзакций и расчёта
                цен.
              </p>
              <WalletForm initialAddress={wallet?.address || ""} />
              <div className="panel">
                <div className="panel-title">Etherscan API</div>
                <p className="muted">
                  Ключ нужен для чтения транзакций. Используется при синхронизации
                  и сохраняется в базе.
                </p>
                <EtherscanForm hasKey={Boolean(settings?.etherscanApiKey)} />
              </div>
              <div className="panel">
                <div className="panel-title">Темы и звуки</div>
                <p className="muted">
                  Переключай тему и звуки в панели задач — настройки сохраняются
                  после перезапуска.
                </p>
              </div>
            </div>
          ),
        },
      ]}
    >
      <div className="stack">
        <div className="notice">
          {wallet?.address ? "Адрес сохранен" : "Адрес не задан"}
          {lastSync ? (
            <span className="muted">
              {" "}Последняя операция: {lastSync.toLocaleString("ru-RU")}
            </span>
          ) : null}
        </div>
        <div className="panel">
          <div className="panel-title">Синхронизация</div>
          <p className="muted">
            Нажми кнопку, чтобы обновить историю транзакций и цены.
          </p>
          <SyncButton />
        </div>

        <div className="grid">
          {holdings.length ? (
            holdings.map((item) => (
              <div className="panel" key={item.token.id}>
                <div className="panel-title">{item.token.symbol}</div>
                <div className="stat">
                  {Number(item.amount.toString()).toFixed(4)}
                </div>
                <div className="muted">{item.token.name}</div>
              </div>
            ))
          ) : (
            <div className="panel">
              <div className="panel-title">Нет данных</div>
              <p className="muted">
                Запусти синхронизацию, чтобы увидеть баланс.
              </p>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-title">Последние транзакции</div>
          {transfers.length ? (
            <table className="xp-table">
              <thead>
                <tr>
                  <th>Время</th>
                  <th>Токен</th>
                  <th>Направление</th>
                  <th>Количество</th>
                  <th>Цена (USD)</th>
                  <th>Сумма (USD)</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((tx: (typeof transfers)[number]) => (
                  <tr key={`${tx.txHash}-${tx.logIndex}`}>
                    <td>{tx.blockTime.toLocaleString("ru-RU")}</td>
                    <td>{tx.token.symbol}</td>
                    <td>{tx.direction === "IN" ? "Вход" : "Выход"}</td>
                    <td>{Number(tx.amount.toString()).toFixed(4)}</td>
                    <td>
                      {tx.priceUsd ? Number(tx.priceUsd.toString()).toFixed(2) : "-"}
                    </td>
                    <td>
                      {tx.valueUsd ? Number(tx.valueUsd.toString()).toFixed(2) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">Транзакций пока нет.</p>
          )}
        </div>
      </div>
    </DesktopShell>
  );
}
