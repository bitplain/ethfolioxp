import { clearWindowLayout, loadWindowLayout, saveWindowLayout } from "@/lib/windowLayouts";

function createStorage() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
}

beforeEach(() => {
  (globalThis as { window?: { localStorage: ReturnType<typeof createStorage> } }).window = {
    localStorage: createStorage(),
  };
});

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

test("clearWindowLayout removes saved layout", () => {
  const payload = [
    {
      id: "ethfolio",
      position: { x: 120, y: 80 },
      size: { width: 760, height: 520 },
      zIndex: 101,
      isOpen: true,
      isMinimized: false,
      isMaximized: false,
    },
  ];

  saveWindowLayout(payload);
  expect(loadWindowLayout()).toEqual(payload);

  clearWindowLayout();
  expect(loadWindowLayout()).toBeNull();
});
