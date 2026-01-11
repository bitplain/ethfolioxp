"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSettings } from "./SettingsProvider";

export type DesktopIcon = {
  id: string;
  label: string;
  variant: string;
  action: { type: "window"; target: string } | { type: "route"; target: string };
};

export default function DesktopIcons({
  icons,
  onOpenWindow,
}: {
  icons: DesktopIcon[];
  onOpenWindow: (id: string) => void;
}) {
  const router = useRouter();
  const { playSound } = useSettings();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div
      className="desktop-icons"
      onClick={() => setSelectedId(null)}
    >
      {icons.map((icon) => (
        <button
          key={icon.id}
          className={`desktop-icon variant-${icon.variant} ${
            selectedId === icon.id ? "selected" : ""
          }`}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            playSound("click");
            setSelectedId(icon.id);
          }}
          onDoubleClick={(event) => {
            event.stopPropagation();
            playSound("notify");
            if (icon.action.type === "route") {
              router.push(icon.action.target);
            } else {
              onOpenWindow(icon.action.target);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              playSound("notify");
              if (icon.action.type === "route") {
                router.push(icon.action.target);
              } else {
                onOpenWindow(icon.action.target);
              }
            }
          }}
        >
          <span className="desktop-icon-glyph" aria-hidden />
          <span className="desktop-icon-label">{icon.label}</span>
        </button>
      ))}
    </div>
  );
}
