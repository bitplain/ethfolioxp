"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSettings } from "./SettingsProvider";

export type StartMenuItem = {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  action: { type: "window"; target: string } | { type: "route"; target: string };
};

export default function StartMenu({
  open,
  leftItems,
  rightItems,
  programItems,
  onCascade,
  onTile,
  onClose,
  onOpenWindow,
}: {
  open: boolean;
  leftItems: StartMenuItem[];
  rightItems: StartMenuItem[];
  programItems: StartMenuItem[];
  onCascade: () => void;
  onTile: () => void;
  onClose: () => void;
  onOpenWindow: (id: string) => void;
}) {
  const router = useRouter();
  const { playSound } = useSettings();
  const [programsOpen, setProgramsOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setProgramsOpen(false);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const handleAction = (item: StartMenuItem) => {
    playSound("click");
    if (item.action.type === "route") {
      router.push(item.action.target);
    } else {
      onOpenWindow(item.action.target);
    }
    onClose();
  };

  return (
    <div className="start-menu" onClick={(event) => event.stopPropagation()}>
      <div className="start-menu-header">Ethfolio XP</div>
      <div className="start-menu-body">
        <div className="start-menu-left">
          {leftItems.map((item) => (
            <button
              key={item.id}
              className="start-menu-item"
              type="button"
              onClick={() => handleAction(item)}
            >
              {item.icon ? (
                <span
                  className="start-menu-icon"
                  style={{ backgroundImage: `url(${item.icon})` }}
                  aria-hidden
                />
              ) : null}
              <div className="start-menu-text">
                <div className="start-menu-label">{item.label}</div>
                {item.description ? (
                  <div className="start-menu-desc">{item.description}</div>
                ) : null}
              </div>
            </button>
          ))}
          <div className="start-menu-divider" />
          <button
            className="start-menu-item programs"
            type="button"
            onMouseEnter={() => setProgramsOpen(true)}
            onClick={() => setProgramsOpen((prev) => !prev)}
          >
            <span className="start-menu-icon programs-icon" aria-hidden />
            <div className="start-menu-text">
              <div className="start-menu-label">All Programs</div>
            </div>
            <span className="start-menu-arrow">▶</span>
          </button>
          <button
            className="start-menu-item"
            type="button"
            onClick={() => {
              playSound("click");
              onCascade();
              onClose();
            }}
          >
            <span className="start-menu-icon utility-icon" aria-hidden />
            <div className="start-menu-text">
              <div className="start-menu-label">Cascade Windows</div>
              <div className="start-menu-desc">Уложить окна каскадом</div>
            </div>
          </button>
          <button
            className="start-menu-item"
            type="button"
            onClick={() => {
              playSound("click");
              onTile();
              onClose();
            }}
          >
            <span className="start-menu-icon utility-icon" aria-hidden />
            <div className="start-menu-text">
              <div className="start-menu-label">Tile Windows</div>
              <div className="start-menu-desc">Разложить плиткой</div>
            </div>
          </button>
        </div>
        <div className="start-menu-right">
          {rightItems.map((item) => (
            <button
              key={item.id}
              className="start-menu-item"
              type="button"
              onClick={() => handleAction(item)}
            >
              {item.icon ? (
                <span
                  className="start-menu-icon"
                  style={{ backgroundImage: `url(${item.icon})` }}
                  aria-hidden
                />
              ) : null}
              <div className="start-menu-text">
                <div className="start-menu-label">{item.label}</div>
                {item.description ? (
                  <div className="start-menu-desc">{item.description}</div>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      </div>
      {programsOpen ? (
        <div
          className="start-menu-programs"
          onMouseEnter={() => setProgramsOpen(true)}
          onMouseLeave={() => setProgramsOpen(false)}
        >
          {programItems.map((item) => (
            <button
              key={item.id}
              className="start-menu-item"
              type="button"
              onClick={() => handleAction(item)}
            >
              {item.icon ? (
                <span
                  className="start-menu-icon"
                  style={{ backgroundImage: `url(${item.icon})` }}
                  aria-hidden
                />
              ) : null}
              <div className="start-menu-text">
                <div className="start-menu-label">{item.label}</div>
                {item.description ? (
                  <div className="start-menu-desc">{item.description}</div>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      ) : null}
      <div className="start-menu-footer">Use taskbar to manage sessions</div>
    </div>
  );
}
