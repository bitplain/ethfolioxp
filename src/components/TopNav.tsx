import Link from "next/link";

export default function TopNav({ email }: { email?: string }) {
  return (
    <header className="header">
      <div className="brand">Ethfolio</div>
      <nav className="nav">
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/settings">Settings</Link>
        {email ? (
          <form action="/api/auth/signout" method="post">
            <button className="btn secondary" type="submit">
              Выйти ({email})
            </button>
          </form>
        ) : (
          <Link className="btn secondary" href="/login">
            Войти
          </Link>
        )}
      </nav>
    </header>
  );
}
