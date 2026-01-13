type Level = "info" | "warn" | "error";

export function log(
  level: Level,
  message: string,
  context?: Record<string, unknown>
) {
  const payload = {
    level,
    message,
    ...context,
    ts: new Date().toISOString(),
  };
  if (process.env.NODE_ENV === "production") {
    console.log(JSON.stringify(payload));
    return;
  }
  console.log(`[${payload.level}] ${payload.message}`, context ?? "");
}
