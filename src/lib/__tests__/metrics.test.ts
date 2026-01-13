import { expect, test } from "vitest";
import { metrics } from "@/lib/metrics";

test("metrics increments counters", () => {
  metrics.increment("external.calls");
  expect(metrics.snapshot().counters["external.calls"]).toBeGreaterThan(0);
});
