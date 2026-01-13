import { expect, test } from "vitest";
import { buildPricePruneWhere } from "@/lib/cleanup";

test("buildPricePruneWhere uses cutoff", () => {
  const where = buildPricePruneWhere(1000);
  expect(where).toEqual({ bucketTs: { lt: 1000 } });
});
