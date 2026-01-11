"use client";

import { useEffect, useRef } from "react";

type Position = { x: number; y: number };

type Size = { width: number; height: number };

type DragState = {
  offsetX: number;
  offsetY: number;
  restoreOnMove?: boolean;
  startX?: number;
  startY?: number;
};

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
  const resizeState = useRef<{ startX: number; startY: number; size: Size } | null>(
    null
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (isMaximized) {
      return;
    }
    const maxWidth = Math.min(window.innerWidth - 80, 980);
    const maxHeight = Math.min(window.innerHeight - 160, 720);
    const nextWidth = Math.min(size.width, maxWidth);
    const nextHeight = Math.min(size.height, maxHeight);
    if (nextWidth !== size.width || nextHeight !== size.height) {
      onSizeChange(id, { width: nextWidth, height: nextHeight });
    }
  }, [id, isMaximized, onSizeChange, size.height, size.width]);

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
      const nextX = Math.max(
        0,
        Math.min(viewWidth - restoreSize.width, event.clientX - restoreSize.width * ratioX)
      );
      const nextY = Math.max(
        0,
        Math.min(viewHeight - restoreSize.height, event.clientY - 24)
      );
      onRestoreFromMaximize(id, { x: nextX, y: nextY }, restoreSize);
      dragState.current = {
        offsetX: event.clientX - nextX,
        offsetY: event.clientY - nextY,
      };
      return;
    }
    const next = {
      x: event.clientX - dragState.current.offsetX,
      y: event.clientY - dragState.current.offsetY,
    };
    onPositionChange(id, next);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    dragState.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isMaximized) {
      return;
    }
    event.stopPropagation();
    resizeState.current = {
      startX: event.clientX,
      startY: event.clientY,
      size,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleResizeMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeState.current) {
      return;
    }
    const dx = event.clientX - resizeState.current.startX;
    const dy = event.clientY - resizeState.current.startY;
    const nextWidth = Math.max(420, resizeState.current.size.width + dx);
    const nextHeight = Math.max(320, resizeState.current.size.height + dy);
    onSizeChange(id, { width: nextWidth, height: nextHeight });
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
      <div
        className="window-resize"
        onPointerDown={handleResizeStart}
        onPointerMove={handleResizeMove}
        onPointerUp={handleResizeEnd}
      />
    </section>
  );
}
