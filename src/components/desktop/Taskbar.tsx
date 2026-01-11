"use client";

import { useEffect, useMemo, useState } from "react";
import { useSettings } from "./SettingsProvider";

export type TaskbarWindow = {
  id: string;
  title: string;
  isMinimized: boolean;
  icon?: string;
};

export default function Taskbar({
  windows,
  activeId,
  startOpen,
  onToggleStart,
  onToggleWindow,
  onCascade,
  onTile,
}: {
  windows: TaskbarWindow[];
  activeId?: string;
  startOpen: boolean;
  onToggleStart: () => void;
  onToggleWindow: (id: string) => void;
  onCascade: () => void;
  onTile: () => void;
}) {
  const { theme, soundEnabled, toggleTheme, toggleSound, playSound } = useSettings();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const timeLabel = now.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const ordered = useMemo(
    () => [...windows].sort((a, b) => a.title.localeCompare(b.title)),
    [windows]
  );

  return (
    <div className="taskbar" onClick={(event) => event.stopPropagation()}>
      <button
        className={`start-button ${startOpen ? "active" : ""}`}
        type="button"
        onClick={() => {
          playSound("click");
          onToggleStart();
        }}
      >
        Start
      </button>
      <div className="taskbar-items">
        {ordered.map((window) => (
          <button
            key={window.id}
            className={`taskbar-item ${activeId === window.id ? "active" : ""} ${
              window.isMinimized ? "is-minimized" : ""
            }`}
            type="button"
            onClick={() => {
              playSound("click");
              onToggleWindow(window.id);
            }}
          >
            {window.icon ? (
              <span
                className="taskbar-icon"
                style={{ backgroundImage: `url(${window.icon})` }}
                aria-hidden
              />
            ) : null}
            <span className="taskbar-title">{window.title}</span>
          </button>
        ))}
      </div>
      <div className="taskbar-right">
        <button
          className="taskbar-toggle"
          type="button"
          onClick={() => {
            playSound("click");
            onCascade();
          }}
        >
          Cascade
        </button>
        <button
          className="taskbar-toggle"
          type="button"
          onClick={() => {
            playSound("click");
            onTile();
          }}
        >
          Tile
        </button>
        <button
          className="taskbar-toggle"
          type="button"
          onClick={() => {
            playSound("click");
            toggleTheme();
          }}
        >
          {theme === "light" ? "Luna" : "Night"}
        </button>
        <button
          className="taskbar-toggle"
          type="button"
          onClick={() => {
            playSound("click");
            toggleSound();
          }}
        >
          {soundEnabled ? "Sound: On" : "Sound: Off"}
        </button>
        <div className="taskbar-clock">{timeLabel}</div>
      </div>
    </div>
  );
}
