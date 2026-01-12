import DesktopShell from "@/components/desktop/DesktopShell";

export default function HomePage() {
  return (
    <DesktopShell
      mainId="welcome"
      mainTitle="RetroDesk"
      mainSubtitle="XP-workspace для крипто-приложений"
    >
      <div className="stack">
        <h1 className="window-heading">Добро пожаловать.</h1>
        <p className="muted">
          Запусти Ethfolio или другие приложения, чтобы подключить кошелек,
          синхронизировать транзакции и смотреть баланс с историческими ценами.
        </p>
        <div className="button-row">
          <a className="xp-button" href="/register">
            Создать аккаунт
          </a>
          <a className="xp-button secondary" href="/login">
            Войти
          </a>
        </div>
        <div className="notice">
          Для атмосферы активированы курсоры и звуки XP. Это можно отключить
          в панели задач.
        </div>
      </div>
    </DesktopShell>
  );
}
