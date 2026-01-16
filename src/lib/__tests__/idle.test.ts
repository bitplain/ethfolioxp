import { expect, test, vi } from "vitest";
import { scheduleIdle } from "@/lib/idle";

test("scheduleIdle falls back to setTimeout", () => {
  vi.useFakeTimers();
  (globalThis as { window?: Window }).window = globalThis as unknown as Window;
  const callback = vi.fn();
  const cancel = scheduleIdle(callback, { timeoutMs: 10 });

  vi.advanceTimersByTime(10);
  expect(callback).toHaveBeenCalledTimes(1);

  cancel();
  delete (globalThis as { window?: Window }).window;
  vi.useRealTimers();
});
