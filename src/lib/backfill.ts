import { Prisma } from "@prisma/client";

export function buildBackfillWhere(
  userId: string,
  cursorId: string | null
): Prisma.TransferWhereInput {
  return {
    userId,
    priceManual: false,
    OR: [{ priceUsd: null }, { priceRub: null }],
    ...(cursorId ? { id: { gt: cursorId } } : {}),
  };
}
