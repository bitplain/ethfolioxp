import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import DesktopShell from "@/components/desktop/DesktopShell";
import EtherscanForm from "@/components/EtherscanForm";
import ApiKeysForm from "@/components/ApiKeysForm";
import WalletForm from "@/components/WalletForm";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUserSettings } from "@/lib/settings";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const [wallet, settings] = await Promise.all([
    prisma.wallet.findFirst({ where: { userId: session.user.id } }),
    getUserSettings(session.user.id),
  ]);
  const extraApiKeys = settings?.apiKeys ?? [];
  const moralisApiKey = settings?.moralisApiKey ?? "";

  return (
    <DesktopShell
      mainId="settings"
      mainTitle="Настройки"
      mainSubtitle="Кошелек и синхронизация"
      mainIcon="/icons/xp/monitor.png"
      userEmail={session.user.email ?? null}
    >
      <div className="stack">
        <p className="muted">
          Вставь ETH‑адрес. Он нужен для синхронизации транзакций и расчёта
          цен.
        </p>
        <WalletForm initialAddress={wallet?.address || ""} />
        <div className="panel">
          <div className="panel-title">Etherscan API</div>
          <p className="muted">
            Ключ нужен для чтения транзакций. Используется при синхронизации и
            сохраняется в базе.
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
    </DesktopShell>
  );
}
