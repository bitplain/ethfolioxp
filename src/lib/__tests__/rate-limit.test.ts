import { describe, expect, test, vi } from "vitest";
import { rateLimit, __testing } from "@/lib/rateLimit";

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

describe("rateLimit cleanup", () => {
  test("drops expired buckets during cleanup", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-16T00:00:00Z"));
    __testing.clear();

    rateLimit("a", 1, 1000);
    rateLimit("b", 1, 1000);
    expect(__testing.size()).toBe(2);

    vi.setSystemTime(new Date("2026-01-16T00:01:01Z"));
    rateLimit("c", 1, 1000);

    expect(__testing.size()).toBe(1);
    vi.useRealTimers();
  });
});
