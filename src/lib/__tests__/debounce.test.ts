import { debounce } from "../debounce";
import { vi } from "vitest";

test("debounce calls once with last args", () => {
  vi.useFakeTimers();
  const fn = vi.fn();
  const debounced = debounce(fn, 200);

  debounced("first");
  debounced("second");

  vi.advanceTimersByTime(199);
  expect(fn).not.toHaveBeenCalled();

  vi.advanceTimersByTime(1);
  expect(fn).toHaveBeenCalledTimes(1);
  expect(fn).toHaveBeenCalledWith("second");

  debounced.cancel();
  vi.useRealTimers();
});
