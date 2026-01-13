import { Prisma } from "@prisma/client";

export type Group = {
  tokenId: string;
  direction: "IN" | "OUT";
  _sum: { amount: Prisma.Decimal | null };
};

type Token = { id: string; symbol: string; name: string };

type Holding = { token: Token; amount: Prisma.Decimal };

export function buildHoldings(groups: Group[], tokens: Token[]): Holding[] {
  const tokenMap = new Map(tokens.map((token) => [token.id, token]));
  const totals = new Map<string, Prisma.Decimal>();

  for (const group of groups) {
    if (!group._sum.amount) {
      continue;
    }
    const signed =
      group.direction === "IN" ? group._sum.amount : group._sum.amount.mul(-1);
    const current = totals.get(group.tokenId) ?? new Prisma.Decimal(0);
    totals.set(group.tokenId, current.add(signed));
  }

  return Array.from(totals.entries())
    .map(([tokenId, amount]) => {
      const token = tokenMap.get(tokenId);
      if (!token) {
        return null;
      }
      return { token, amount };
    })
    .filter((item): item is Holding => Boolean(item))
    .filter((item) => item.amount.abs().greaterThan(0));
}
