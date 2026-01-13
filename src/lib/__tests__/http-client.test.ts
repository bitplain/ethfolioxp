import { expect, test, vi } from "vitest";
import { fetchJson } from "@/lib/httpClient";

test("fetchJson returns ok false on failure", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

  const result = await fetchJson("https://example.com", { timeoutMs: 10 });

  expect(result.ok).toBe(false);
});
