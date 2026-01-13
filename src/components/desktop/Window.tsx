"use client";

import { useEffect, useRef } from "react";
import {
  clampWindowBounds,
  WINDOW_MARGIN,
  WINDOW_MIN_HEIGHT,
  WINDOW_MIN_WIDTH,
} from "@/lib/windowBounds";

type Position = { x: number; y: number };

type Size = { width: number; height: number };

type DragState = {
  offsetX: number;
  offsetY: number;
  restoreOnMove?: boolean;
  startX?: number;
  startY?: number;
};

type ResizeDirection = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
const TASKBAR_HEIGHT = 44;

type WindowProps = {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  isMinimized: boolean;
  isMaximized: boolean;
  restore?: { position: Position; size: Size };
  zIndex: number;
  position: Position;
  size: Size;
  canClose?: boolean;
  onClose: (id: string) => void;
  onMinimize: (id: string) => void;
  onMaximize: (id: string) => void;
  onRestoreFromMaximize: (id: string, position: Position, size: Size) => void;
  onFocus: (id: string) => void;
  onPositionChange: (id: string, position: Position) => void;
  onSizeChange: (id: string, size: Size) => void;
  children: React.ReactNode;
};

export default function Window({
  id,
  title,
  subtitle,
  icon,
  isMinimized,
  isMaximized,
  restore,
  zIndex,
  position,
  size,
  canClose = true,
  onClose,
  onMinimize,
  onMaximize,
  onRestoreFromMaximize,
  onFocus,
  onPositionChange,
  onSizeChange,
  children,
}: WindowProps) {
  const dragState = useRef<DragState | null>(null);
  const resizeState = useRef<{
    startX: number;
    startY: number;
    size: Size;
    position: Position;
    direction: ResizeDirection;
  } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (isMaximized) {
      return;
    }
    const viewWidth = window.innerWidth;
    const viewHeight = window.innerHeight - TASKBAR_HEIGHT;
    const next = clampWindowBounds({
      size,
      position,
      viewWidth,
      viewHeight,
    });
    if (next.size.width !== size.width || next.size.height !== size.height) {
      onSizeChange(id, next.size);
    }
    if (next.position.x !== position.x || next.position.y !== position.y) {
      onPositionChange(id, next.position);
    }
  }, [
    id,
    isMaximized,
    onPositionChange,
    onSizeChange,
    position.x,
    position.y,
    size.height,
    size.width,
  ]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest(".window-controls")) {
      return;
    }
    if (isMaximized) {
      onFocus(id);
      dragState.current = {
        offsetX: 0,
        offsetY: 0,
        restoreOnMove: true,
        startX: event.clientX,
        startY: event.clientY,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    onFocus(id);
    dragState.current = {
      offsetX: event.clientX - position.x,
      offsetY: event.clientY - position.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current) {
      return;
    }
    if (dragState.current.restoreOnMove) {
      const dx = Math.abs(event.clientX - (dragState.current.startX ?? 0));
      const dy = Math.abs(event.clientY - (dragState.current.startY ?? 0));
      if (dx < 4 && dy < 4) {
        return;
      }
      const fallbackSize = { width: 760, height: 520 };
      const restoreSize = restore?.size ?? fallbackSize;
      const viewWidth = typeof window !== "undefined" ? window.innerWidth : 1024;
      const viewHeight = typeof window !== "undefined" ? window.innerHeight - 44 : 768;
      const ratioX = viewWidth ? event.clientX / viewWidth : 0.5;
      const next = clampWindowBounds({
        size: restoreSize,
        position: {
          x: event.clientX - restoreSize.width * ratioX,
          y: event.clientY - 24,
        },
        viewWidth,
        viewHeight,
      });
      onRestoreFromMaximize(id, next.position, next.size);
      dragState.current = {
        offsetX: event.clientX - next.position.x,
        offsetY: event.clientY - next.position.y,
      };
      return;
    }
    const next = {
      x: event.clientX - dragState.current.offsetX,
      y: event.clientY - dragState.current.offsetY,
    };
    const viewWidth = typeof window !== "undefined" ? window.innerWidth : 1024;
    const viewHeight =
      typeof window !== "undefined" ? window.innerHeight - TASKBAR_HEIGHT : 768;
    const clamped = clampWindowBounds({ size, position: next, viewWidth, viewHeight });
    onPositionChange(id, clamped.position);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    dragState.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleResizeStart =
    (direction: ResizeDirection) => (event: React.PointerEvent<HTMLDivElement>) => {
    if (isMaximized) {
      return;
    }
    event.stopPropagation();
    onFocus(id);
    resizeState.current = {
      startX: event.clientX,
      startY: event.clientY,
      size,
      position,
      direction,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleResizeMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeState.current) {
      return;
    }
    const { startX, startY, size: startSize, position: startPos, direction } =
      resizeState.current;
    const viewWidth = typeof window !== "undefined" ? window.innerWidth : 1024;
    const viewHeight =
      typeof window !== "undefined" ? window.innerHeight - TASKBAR_HEIGHT : 768;
    const maxWidth = Math.max(160, viewWidth - WINDOW_MARGIN * 2);
    const maxHeight = Math.max(200, viewHeight - WINDOW_MARGIN * 2);
    const minWidth = Math.min(WINDOW_MIN_WIDTH, maxWidth);
    const minHeight = Math.min(WINDOW_MIN_HEIGHT, maxHeight);
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;

    let nextWidth = startSize.width;
    let nextHeight = startSize.height;
    let nextX = startPos.x;
    let nextY = startPos.y;

    if (direction.includes("e")) {
      nextWidth = startSize.width + dx;
    }
    if (direction.includes("s")) {
      nextHeight = startSize.height + dy;
    }
    if (direction.includes("w")) {
      nextWidth = startSize.width - dx;
    }
    if (direction.includes("n")) {
      nextHeight = startSize.height - dy;
    }

    nextWidth = Math.min(Math.max(minWidth, nextWidth), maxWidth);
    nextHeight = Math.min(Math.max(minHeight, nextHeight), maxHeight);

    if (direction.includes("w")) {
      nextX = startPos.x + (startSize.width - nextWidth);
    }
    if (direction.includes("n")) {
      nextY = startPos.y + (startSize.height - nextHeight);
    }

    const clamped = clampWindowBounds({
      size: { width: nextWidth, height: nextHeight },
      position: { x: nextX, y: nextY },
      viewWidth,
      viewHeight,
    });

    onSizeChange(id, clamped.size);
    if (clamped.position.x !== startPos.x || clamped.position.y !== startPos.y) {
      onPositionChange(id, clamped.position);
    }
  };

  const handleResizeEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    resizeState.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <section
      className={`window ${isMinimized ? "is-minimized" : ""} ${
        isMaximized ? "is-maximized" : ""
      }`}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        zIndex,
        width: size.width,
        height: size.height,
      }}
      onPointerDown={() => onFocus(id)}
      aria-hidden={isMinimized}
    >
      <div
        className="window-header"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={() => onMaximize(id)}
      >
        <div className="window-titlebar">
          {icon ? (
            <span
              className="window-icon"
              style={{ backgroundImage: `url(${icon})` }}
              aria-hidden
            />
          ) : null}
          <div>
            <div className="window-title">{title}</div>
            {subtitle ? <div className="window-subtitle">{subtitle}</div> : null}
          </div>
        </div>
        <div className="window-controls">
          <button
            className="window-control minimize"
            type="button"
            aria-label="Minimize"
            onClick={() => onMinimize(id)}
          />
          <button
            className="window-control maximize"
            type="button"
            aria-label="Maximize"
            onClick={() => onMaximize(id)}
          />
          <button
            className="window-control close"
            type="button"
            aria-label="Close"
            onClick={() => (canClose ? onClose(id) : onMinimize(id))}
          />
        </div>
      </div>
      <div className="window-content">{children}</div>
      {(["n", "s", "e", "w", "ne", "nw", "se", "sw"] as ResizeDirection[]).map(
        (direction) => (
          <div
            key={direction}
            className={`window-resize ${direction}`}
            onPointerDown={handleResizeStart(direction)}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeEnd}
          />
        )
      )}
    </section>
  );
}
