import { expect, test, vi } from "vitest";
import { runSync } from "@/lib/syncAction";

test("runSync triggers onSuccess for successful sync", async () => {
  const onSuccess = vi.fn();
  const request = vi.fn().mockResolvedValue({ ok: true, data: { created: 3 } });

  const result = await runSync({ request, onSuccess });

  expect(result.ok).toBe(true);
  expect(onSuccess).toHaveBeenCalledTimes(1);
});
