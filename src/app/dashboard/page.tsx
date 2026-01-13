import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import DesktopShell from "@/components/desktop/DesktopShell";
import EtherscanForm from "@/components/EtherscanForm";
import ApiKeysForm from "@/components/ApiKeysForm";
import SyncButton from "@/components/SyncButton";
import BackfillButton from "@/components/BackfillButton";
import TransferTable from "@/components/TransferTable";
import WalletForm from "@/components/WalletForm";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildHoldings } from "@/lib/holdings";
import { encodeCursor } from "@/lib/pagination";
import { getUserSettings } from "@/lib/settings";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const [wallet, settings, transfers, groupedTotals] = await Promise.all([
    prisma.wallet.findFirst({ where: { userId: session.user.id } }),
    getUserSettings(session.user.id),
    prisma.transfer.findMany({
      where: { userId: session.user.id },
      include: { token: true },
      orderBy: { blockTime: "desc" },
      take: 50,
    }),
    prisma.transfer.groupBy({
      by: ["tokenId", "direction"],
      where: { userId: session.user.id },
      _sum: { amount: true },
    }),
  ]);

  const tokenIds = Array.from(
    new Set(groupedTotals.map((group) => group.tokenId))
  );
  const tokens = tokenIds.length
    ? await prisma.token.findMany({ where: { id: { in: tokenIds } } })
    : [];
  const holdings = buildHoldings(groupedTotals, tokens);

  const lastSync = transfers[0]?.blockTime;
  const extraApiKeys = settings?.apiKeys ?? [];
  const moralisApiKey = settings?.moralisApiKey ?? "";
  const lastTransfer = transfers[transfers.length - 1];
  const initialCursor = lastTransfer
    ? encodeCursor({ id: lastTransfer.id, ts: lastTransfer.blockTime.getTime() })
    : null;
  const initialTransfers = transfers.map((tx) => ({
    id: tx.id,
    txHash: tx.txHash,
    logIndex: tx.logIndex,
    blockTime: tx.blockTime.toISOString(),
    direction: tx.direction,
    amount: tx.amount.toString(),
    priceUsd: tx.priceUsd?.toString() ?? null,
    valueUsd: tx.valueUsd?.toString() ?? null,
    priceRub: tx.priceRub?.toString() ?? null,
    valueRub: tx.valueRub?.toString() ?? null,
    priceManual: tx.priceManual,
    token: { symbol: tx.token.symbol, name: tx.token.name },
  }));

  return (
    <DesktopShell
      mainId="ethfolio"
      mainTitle="Ethfolio"
      mainSubtitle="Портфель и транзакции"
      mainIcon="/icons/xp/eth.svg"
      mainDefaultOpen={false}
      mainCanClose
      userEmail={session.user.email ?? null}
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
                  <BackfillButton />
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
              <ApiKeysForm
                initialMoralisKey={moralisApiKey}
                initialKeys={extraApiKeys}
              />
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
          <BackfillButton />
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

        <TransferTable
          initial={initialTransfers}
          initialCursor={initialCursor}
        />
      </div>
    </DesktopShell>
  );
}
