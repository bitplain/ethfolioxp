import { Prisma } from "@prisma/client";
import { buildHoldings } from "../holdings";

test("buildHoldings nets IN and OUT per token and filters zeroes", () => {
  const groups = [
    { tokenId: "t1", direction: "IN", _sum: { amount: new Prisma.Decimal("2") } },
    { tokenId: "t1", direction: "OUT", _sum: { amount: new Prisma.Decimal("1.5") } },
    { tokenId: "t2", direction: "OUT", _sum: { amount: new Prisma.Decimal("5") } },
    { tokenId: "t2", direction: "IN", _sum: { amount: new Prisma.Decimal("5") } },
  ];
  const tokens = [
    { id: "t1", symbol: "AAA", name: "Token A" },
    { id: "t2", symbol: "BBB", name: "Token B" },
  ];

  const holdings = buildHoldings(groups, tokens);

  expect(holdings).toHaveLength(1);
  expect(holdings[0].token.id).toBe("t1");
  expect(holdings[0].amount.toString()).toBe("0.5");
});
