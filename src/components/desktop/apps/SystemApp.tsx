export default function SystemApp({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="stack">
      <div className="panel-title">{title}</div>
      <p className="muted">{message}</p>
    </div>
  );
}
