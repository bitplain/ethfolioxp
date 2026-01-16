import { expect, test, vi } from "vitest";
import { fetchJson, __testing } from "@/lib/httpClient";

test("fetchJson returns ok false on failure", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

  const result = await fetchJson("https://example.com", { timeoutMs: 10 });

  expect(result.ok).toBe(false);
});

test("fetchJson prunes expired cache", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-16T00:00:00Z"));
  __testing.clear();

  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ value: 1 }),
  });
  vi.stubGlobal("fetch", fetchMock);

  await fetchJson("https://example.com", { cacheTtlMs: 1000 });
  expect(__testing.size()).toBe(1);

  vi.setSystemTime(new Date("2026-01-16T00:00:02Z"));
  await fetchJson("https://example.com/next", { cacheTtlMs: 1000 });
  expect(__testing.size()).toBe(1);

  vi.useRealTimers();
});
