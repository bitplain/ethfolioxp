export type TransferCursor = { id: string; ts: number };

export function encodeCursor(cursor: TransferCursor) {
  return Buffer.from(JSON.stringify(cursor)).toString("base64");
}

export function decodeCursor(raw?: string | null): TransferCursor | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
    if (!parsed?.id || typeof parsed.ts !== "number") {
      return null;
    }
    return { id: String(parsed.id), ts: Number(parsed.ts) };
  } catch {
    return null;
  }
}
