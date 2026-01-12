# Window Min Width Design

## Goal

Prevent Ethfolio and other desktop windows from shrinking so far that the
content is clipped on the right edge. The target minimum width is 520px, while
still allowing smaller widths on narrow viewports (mobile layout).

## Approach

Apply a global minimum width for all windows at the component level and in
CSS. The Window component will clamp width during resize operations, ensuring
the size stored in layout state never drops below 520px on desktop screens.
On load, the same clamp will correct previously saved layouts that were smaller
than the new minimum. This keeps window state consistent and avoids rendering
surprises after refresh.

In CSS, add `min-width: 520px` to `.window` so content stays within rounded
edges even if inline styles attempt a smaller width. For responsive layouts
where windows stack vertically (viewport below the desktop breakpoint), relax
the min width to `100%` so the UI still fits on small screens without forcing
horizontal scroll.

## Non-goals

- No layout changes to panel content or typography.
- No changes to window height behavior or maximized sizing.
- No modifications to window tiling logic beyond minimum width enforcement.

## Testing

- Manual: resize any window on desktop to confirm it stops at 520px and keeps
  rounded edges.
- Manual: check mobile breakpoint (<= 840px) to confirm windows still fit the
  viewport without horizontal overflow.
