export const DEFAULT_TRANSFER_LIMIT = 20;
export const MIN_TRANSFER_LIMIT = 10;
export const MAX_TRANSFER_LIMIT = 100;

export function getTransferLimit(params: URLSearchParams) {
  const raw = Number(params.get("limit") || DEFAULT_TRANSFER_LIMIT);
  return Math.min(MAX_TRANSFER_LIMIT, Math.max(MIN_TRANSFER_LIMIT, raw));
}
