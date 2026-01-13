type Snapshot = {
  counters: Record<string, number>;
  timers: Record<string, { count: number; totalMs: number }>;
};

const state: Snapshot = { counters: {}, timers: {} };

export const metrics = {
  increment(name: string, by = 1) {
    state.counters[name] = (state.counters[name] ?? 0) + by;
  },
  timing(name: string, ms: number) {
    const entry = state.timers[name] ?? { count: 0, totalMs: 0 };
    entry.count += 1;
    entry.totalMs += ms;
    state.timers[name] = entry;
  },
  snapshot(): Snapshot {
    return JSON.parse(JSON.stringify(state)) as Snapshot;
  },
};
