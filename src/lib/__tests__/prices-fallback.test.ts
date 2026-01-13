import { expect, test } from "vitest";
import { pickNearbyBucket } from "@/lib/prices";

test("pickNearbyBucket returns closest when within maxAge", () => {
  expect(pickNearbyBucket(1000, [900, 1100], 200)).toBe(900);
  expect(pickNearbyBucket(1000, [2000], 200)).toBe(null);
});
