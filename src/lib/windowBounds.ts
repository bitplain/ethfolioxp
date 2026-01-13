export const WINDOW_MARGIN = 12;
export const WINDOW_MIN_WIDTH = 520;
export const WINDOW_MIN_HEIGHT = 320;

type WindowPosition = { x: number; y: number };
type WindowSize = { width: number; height: number };

type WindowBoundsInput = {
  size: WindowSize;
  position: WindowPosition;
  viewWidth: number;
  viewHeight: number;
};

type WindowBoundsOutput = {
  size: WindowSize;
  position: WindowPosition;
};

export function clampWindowBounds({
  size,
  position,
  viewWidth,
  viewHeight,
}: WindowBoundsInput): WindowBoundsOutput {
  const safeViewWidth = Math.max(0, viewWidth);
  const safeViewHeight = Math.max(0, viewHeight);
  const maxWidth = Math.max(160, safeViewWidth - WINDOW_MARGIN * 2);
  const maxHeight = Math.max(200, safeViewHeight - WINDOW_MARGIN * 2);
  const minWidth = Math.min(WINDOW_MIN_WIDTH, maxWidth);
  const minHeight = Math.min(WINDOW_MIN_HEIGHT, maxHeight);
  const nextWidth = Math.min(Math.max(minWidth, size.width), maxWidth);
  const nextHeight = Math.min(Math.max(minHeight, size.height), maxHeight);
  const maxX = Math.max(WINDOW_MARGIN, safeViewWidth - nextWidth - WINDOW_MARGIN);
  const maxY = Math.max(WINDOW_MARGIN, safeViewHeight - nextHeight - WINDOW_MARGIN);
  const nextX = Math.min(Math.max(position.x, WINDOW_MARGIN), maxX);
  const nextY = Math.min(Math.max(position.y, WINDOW_MARGIN), maxY);

  return {
    size: { width: nextWidth, height: nextHeight },
    position: { x: nextX, y: nextY },
  };
}
