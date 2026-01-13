import { describe, expect, test } from "vitest";
import { rateLimit } from "@/lib/rateLimit";

describe("rateLimit", () => {
  test("blocks after limit within window", () => {
    const key = "ip:1.1.1.1";
    const limit = 2;
    const windowMs = 1000;

    expect(rateLimit(key, limit, windowMs).ok).toBe(true);
    expect(rateLimit(key, limit, windowMs).ok).toBe(true);
    expect(rateLimit(key, limit, windowMs).ok).toBe(false);
  });
});
