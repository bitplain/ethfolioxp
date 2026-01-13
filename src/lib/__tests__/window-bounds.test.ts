import { clampWindowBounds, WINDOW_MARGIN, WINDOW_MIN_HEIGHT, WINDOW_MIN_WIDTH } from "@/lib/windowBounds";

test("clamps width/height to minimum and keeps window inside viewport", () => {
  const result = clampWindowBounds({
    size: { width: 420, height: 200 },
    position: { x: 900, y: 10 },
    viewWidth: 1200,
    viewHeight: 800,
  });

  expect(result.size.width).toBe(WINDOW_MIN_WIDTH);
  expect(result.size.height).toBe(WINDOW_MIN_HEIGHT);
  expect(result.position.x).toBe(1200 - WINDOW_MIN_WIDTH - WINDOW_MARGIN);
  expect(result.position.y).toBe(WINDOW_MARGIN);
});

test("shrinks minimum width on narrow viewports", () => {
  const viewWidth = 500;
  const viewHeight = 600;
  const expectedWidth = viewWidth - WINDOW_MARGIN * 2;
  const result = clampWindowBounds({
    size: { width: 300, height: 400 },
    position: { x: 0, y: 0 },
    viewWidth,
    viewHeight,
  });

  expect(result.size.width).toBe(expectedWidth);
  expect(result.position.x).toBe(WINDOW_MARGIN);
});

test("clamps oversize windows to available bounds", () => {
  const viewWidth = 900;
  const viewHeight = 700;
  const maxWidth = viewWidth - WINDOW_MARGIN * 2;
  const maxHeight = viewHeight - WINDOW_MARGIN * 2;
  const result = clampWindowBounds({
    size: { width: 1400, height: 900 },
    position: { x: -200, y: -200 },
    viewWidth,
    viewHeight,
  });

  expect(result.size.width).toBe(maxWidth);
  expect(result.size.height).toBe(maxHeight);
  expect(result.position.x).toBe(WINDOW_MARGIN);
  expect(result.position.y).toBe(WINDOW_MARGIN);
});
