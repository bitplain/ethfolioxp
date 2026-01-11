export type WindowLayout = {
  id: string;
  position: { x: number; y: number };
  size?: { width: number; height: number };
  zIndex: number;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized?: boolean;
};

const STORAGE_KEY = "ethfolio.windowLayout";

export function loadWindowLayout(): WindowLayout[] | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as WindowLayout[];
    if (!Array.isArray(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveWindowLayout(layout: WindowLayout[]) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
}

export function cascadeLayout(ids: string[]) {
  return ids.map((id, index) => ({
    id,
    position: { x: 120 + index * 28, y: 80 + index * 26 },
  }));
}

export function tileLayout(ids: string[], width: number, height: number) {
  if (ids.length === 0) {
    return [];
  }
  const columns = Math.ceil(Math.sqrt(ids.length));
  const rows = Math.ceil(ids.length / columns);
  const gutter = 16;
  const tileWidth = Math.max(260, Math.floor((width - gutter * (columns + 1)) / columns));
  const tileHeight = Math.max(180, Math.floor((height - gutter * (rows + 1)) / rows));

  return ids.map((id, index) => {
    const row = Math.floor(index / columns);
    const col = index % columns;
    return {
      id,
      position: {
        x: gutter + col * (tileWidth + gutter),
        y: gutter + row * (tileHeight + gutter),
      },
      size: { width: tileWidth, height: tileHeight },
    };
  });
}
