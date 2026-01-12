import { postJson } from "../http";
import { vi } from "vitest";

test("postJson returns ok false on network error", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

  const result = await postJson("/api/test", { a: 1 });

  expect(result.ok).toBe(false);
  expect(result.error).toContain("Network");

  vi.unstubAllGlobals();
});
