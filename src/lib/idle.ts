type IdleOptions = { timeoutMs?: number };

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

export function scheduleIdle(callback: () => void, options: IdleOptions = {}) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const idleWindow = window as IdleWindow;
  if (idleWindow.requestIdleCallback) {
    const id = idleWindow.requestIdleCallback(() => callback(), {
      timeout: options.timeoutMs,
    });
    return () => idleWindow.cancelIdleCallback?.(id);
  }

  const timeout = window.setTimeout(callback, options.timeoutMs ?? 1000);
  return () => window.clearTimeout(timeout);
}
