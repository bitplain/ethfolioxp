# RetroDesk Performance + Rename Design

**Goal:** Improve UI performance (rendering, images, data flow) and complete the
project rename to RetroDesk while preserving current UX.

## Context

- Desktop windowing is state-heavy; frequent state updates cause re-renders.
- Transfer history loads 50 rows per request; client adds more on demand.
- Many icons are background images; large wallpaper is CSS-only.
- Project metadata still references the old name.

## Decisions

### Rendering

- Add `React.memo` to high-frequency components (DesktopShell, Window, Taskbar,
  StartMenu, DesktopIcons, TransferTable) and stabilize props with `useMemo` /
  `useCallback`.
- Use `content-visibility: auto` + `contain-intrinsic-size` on window/table
  containers to skip offscreen render work without full virtualization.
- Keep window list simple; avoid a virtualizer unless windows scale > 20.

### Data and API

- Reduce transfer page size to 20 on server and client.
- Add a one-shot idle prefetch of the next cursor page to make "Load more" fast.
- Leverage existing HTTP cache TTL for external API calls, and add short-lived
  cache hints where safe (non-user-specific data).

### Images

- Replace inline/hero images with `next/image` where sizing is known.
- For CSS icon backgrounds, use `image-set()` with WebP/AVIF sources while
  keeping the XP layout intact.

### State and Effects

- Centralize window actions and ensure no-op updates return the same state
  object to reduce re-renders.
- Ensure debounced layout persistence is created once and canceled on unmount.

### Rename

- Update project name and container names to `retrodesk`.
- Update docs and UI copy where the old project name is used.
- Migrate localStorage keys from `ethfolio.*` to `retrodesk.*`.

## Testing

- Add/adjust unit tests for new helpers (pagination limit parsing, storage key
  migration, prefetch guards).
- Keep existing test suite green and re-run after changes.
