import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import DesktopShell from "@/components/desktop/DesktopShell";
import EtherscanForm from "@/components/EtherscanForm";
import WalletForm from "@/components/WalletForm";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const [wallet, settings] = await Promise.all([
    prisma.wallet.findFirst({ where: { userId: session.user.id } }),
    prisma.userSettings.findUnique({ where: { userId: session.user.id } }),
  ]);

  return (
    <DesktopShell
      mainId="settings"
      mainTitle="Настройки"
      mainSubtitle="Кошелек и синхронизация"
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
