"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSettings } from "./SettingsProvider";
import DesktopIcons, { DesktopIcon } from "./DesktopIcons";
import StartMenu, { StartMenuItem } from "./StartMenu";
import Taskbar from "./Taskbar";
import Window from "./Window";
import NotepadApp from "./apps/NotepadApp";
import CalculatorApp from "./apps/CalculatorApp";
import ClockApp from "./apps/ClockApp";
import AboutApp from "./apps/AboutApp";
import SystemApp from "./apps/SystemApp";
import AccountApp from "./apps/AccountApp";
import {
  cascadeLayout,
  loadWindowLayout,
  saveWindowLayout,
  tileLayout,
} from "@/lib/windowLayouts";
import { debounce } from "@/lib/debounce";

type WindowConfig = {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  content: React.ReactNode;
  defaultOpen?: boolean;
  canClose?: boolean;
};

type WindowState = {
  id: string;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  position: { x: number; y: number };
  size: { width: number; height: number };
  restore?: { position: { x: number; y: number }; size: { width: number; height: number } };
};

const OFFSET_X = 40;
const OFFSET_Y = 32;
const TASKBAR_HEIGHT = 44;
const DESKTOP_GUTTER = 0;

function getMaximizedBounds() {
  if (typeof window === "undefined") {
    return {
      position: { x: 0, y: 0 },
      size: { width: 760, height: 520 },
    };
  }
  const width = Math.max(420, window.innerWidth);
  const height = Math.max(320, window.innerHeight - TASKBAR_HEIGHT);
  return {
    position: { x: 0, y: 0 },
    size: { width, height },
  };
}

function createInitialState(configs: WindowConfig[]): WindowState[] {
  return configs.map((config, index) => ({
    id: config.id,
    isOpen: config.defaultOpen ?? false,
    isMinimized: false,
    isMaximized: false,
    zIndex: 10 + index,
    position: {
      x: 120 + index * OFFSET_X,
      y: 80 + index * OFFSET_Y,
    },
    size: { width: 760, height: 520 },
  }));
}

export default function DesktopShell({
  children,
  mainTitle,
  mainSubtitle,
  mainId = "ethfolio",
  mainIcon = "/icons/xp/monitor.png",
  mainDefaultOpen = true,
  mainCanClose = false,
  extraWindows,
  userEmail,
}: {
  children: React.ReactNode;
  mainTitle: string;
  mainSubtitle?: string;
  mainId?: string;
  mainIcon?: string;
  mainDefaultOpen?: boolean;
  mainCanClose?: boolean;
  extraWindows?: WindowConfig[];
  userEmail?: string | null;
}) {
  const router = useRouter();
  const { playSound } = useSettings();
  const [startOpen, setStartOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    open: boolean;
    x: number;
    y: number;
  }>({ open: false, x: 0, y: 0 });
  const zCounter = useRef(100);
  const saveLayout = useMemo(() => debounce(saveWindowLayout, 250), []);

  const windowConfigs = useMemo<WindowConfig[]>(() => {
    const baseConfigs: WindowConfig[] = [
      {
        id: mainId,
        title: mainTitle,
        subtitle: mainSubtitle,
        icon: mainIcon,
        content: children,
        defaultOpen: mainDefaultOpen,
        canClose: mainCanClose,
      },
      {
        id: "sync",
        title: "Sync Center",
        subtitle: "Синхронизация кошелька",
        icon: "/icons/xp/programs.png",
        content: (
          <SystemApp
            title="Sync Center"
            message="Открой портфель, чтобы синхронизировать данные."
          />
        ),
      },
      {
        id: "settings",
        title: "Settings",
        subtitle: "Кошелек и интерфейс",
        icon: "/icons/xp/monitor.png",
        content: (
          <SystemApp
            title="Settings"
            message="Открой портфель, чтобы изменить настройки."
          />
        ),
      },
      {
        id: "account",
        title: "User Account",
        subtitle: "Профиль и пароль",
        icon: "/icons/xp/user.svg",
        content: userEmail ? (
          <AccountApp email={userEmail} />
        ) : (
          <SystemApp
            title="User Account"
            message="Войди в аккаунт, чтобы изменить пароль."
          />
        ),
      },
      {
        id: "notepad",
        title: "Notepad",
        subtitle: "Быстрые заметки",
        icon: "/icons/xp/docs.png",
        content: <NotepadApp />,
      },
      {
        id: "calculator",
        title: "Calculator",
        subtitle: "Считай быстро",
        icon: "/icons/xp/window.png",
        content: <CalculatorApp />,
      },
      {
        id: "clock",
        title: "Clock",
        subtitle: "Время системы",
        icon: "/icons/xp/monitor.png",
        content: <ClockApp />,
      },
      {
        id: "about",
        title: "About",
        subtitle: "О программе",
        icon: "/icons/xp/window.png",
        content: <AboutApp />,
      },
      {
        id: "computer",
        title: "My Computer",
        subtitle: "Системная информация",
        icon: "/icons/xp/my-computer.png",
        content: (
          <SystemApp
            title="My Computer"
            message="Локальный диск (C:) · Пользовательские файлы · RetroDesk"
          />
        ),
      },
      {
        id: "network",
        title: "Network",
        subtitle: "Сетевое окружение",
        icon: "/icons/xp/network.png",
        content: (
          <SystemApp
            title="Network"
            message="Подключение активно. Устройства не обнаружены."
          />
        ),
      },
      {
        id: "docs",
        title: "My Documents",
        subtitle: "Личные файлы",
        icon: "/icons/xp/folder.png",
        content: (
          <SystemApp
            title="My Documents"
            message="Папка пуста. Используй раздел Settings для данных кошелька."
          />
        ),
      },
      {
        id: "control-panel",
        title: "Control Panel",
        subtitle: "Системные настройки",
        icon: "/icons/xp/monitor.png",
        content: (
          <SystemApp
            title="Control Panel"
            message="Темы, звук, сеть и системные параметры."
          />
        ),
      },
      {
        id: "recycle",
        title: "Recycle Bin",
        subtitle: "Корзина",
        icon: "/icons/xp/recycle.png",
        content: (
          <SystemApp
            title="Recycle Bin"
            message="Корзина пуста. Ты сегодня ничего не удалял."
          />
        ),
      },
    ];

    if (!extraWindows?.length) {
      return baseConfigs;
    }

    const overrides = new Map(extraWindows.map((item) => [item.id, item]));
    const merged = baseConfigs.map((item) => overrides.get(item.id) ?? item);
    const extraOnly = extraWindows.filter(
      (item) => !baseConfigs.some((base) => base.id === item.id)
    );
    return [...merged, ...extraOnly];
  }, [
    children,
    extraWindows,
    mainId,
    mainSubtitle,
    mainTitle,
    mainIcon,
    mainDefaultOpen,
    mainCanClose,
    userEmail,
  ]);

  const [windows, setWindows] = useState<WindowState[]>(() =>
    createInitialState(windowConfigs)
  );

  useEffect(() => {
    const saved = loadWindowLayout();
    if (!saved) {
      return;
    }
    const maxZ = saved.reduce((max, item) => Math.max(max, item.zIndex), 100);
    zCounter.current = maxZ;
    setWindows((prev) =>
      prev.map((item) => {
        const match = saved.find((savedItem) => savedItem.id === item.id);
        if (!match) {
          return item;
        }
        if (item.id === mainId && !mainDefaultOpen) {
          return {
            ...item,
            position: match.position,
            size: match.size?.width ? match.size : item.size,
            zIndex: match.zIndex,
            isOpen: false,
            isMinimized: false,
            isMaximized: false,
          };
        }
        return {
          ...item,
          position: match.position,
          size: match.size?.width ? match.size : item.size,
          zIndex: match.zIndex,
          isOpen: match.isOpen,
          isMinimized: match.isMinimized,
          isMaximized: match.isMaximized ?? false,
        };
      })
    );
  }, [mainDefaultOpen, mainId]);

  const windowsMap = useMemo(() => {
    const map = new Map<string, WindowState>();
    windows.forEach((item) => map.set(item.id, item));
    return map;
  }, [windows]);

  const openWindow = (id: string) => {
    playSound("notify");
    setWindows((prev) => {
      const exists = prev.some((item) => item.id === id);
      if (!exists) {
        return prev;
      }
      return prev.map((item) =>
        item.id === id
          ? {
              ...item,
              isOpen: true,
              isMinimized: false,
              zIndex: ++zCounter.current,
            }
          : item
      );
    });
  };

  const closeWindow = (id: string) => {
    playSound("click");
    setWindows((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isOpen: false, isMinimized: false } : item
      )
    );
  };

  const toggleMinimize = (id: string) => {
    setWindows((prev) =>
      prev.map((item) => {
        if (item.id !== id) {
          return item;
        }
        playSound(item.isMinimized ? "restore" : "minimize");
        return {
          ...item,
          isMinimized: !item.isMinimized,
          zIndex: item.isMinimized ? ++zCounter.current : item.zIndex,
        };
      })
    );
  };

  const focusWindow = (id: string) => {
    setWindows((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, isMinimized: false, zIndex: ++zCounter.current }
          : item
      )
    );
  };

  const updatePosition = (id: string, position: { x: number; y: number }) => {
    setWindows((prev) =>
      prev.map((item) => (item.id === id ? { ...item, position } : item))
    );
  };

  const updateSize = (id: string, size: { width: number; height: number }) => {
    setWindows((prev) =>
      prev.map((item) => (item.id === id ? { ...item, size } : item))
    );
  };

  const toggleMaximize = (id: string) => {
    playSound("restore");
    setWindows((prev) =>
      prev.map((item) => {
        if (item.id !== id) {
          return item;
        }
        if (!item.isMaximized) {
          const bounds = getMaximizedBounds();
          return {
            ...item,
            isOpen: true,
            isMinimized: false,
            isMaximized: true,
            restore: { position: item.position, size: item.size },
            position: bounds.position,
            size: bounds.size,
            zIndex: ++zCounter.current,
          };
        }
        const fallback = {
          position: { x: 120, y: 80 },
          size: { width: 760, height: 520 },
        };
        return {
          ...item,
          isMaximized: false,
          position: item.restore?.position ?? fallback.position,
          size: item.restore?.size ?? fallback.size,
          restore: undefined,
          zIndex: ++zCounter.current,
        };
      })
    );
  };

  useEffect(() => {
    const payload = windows.map((item) => ({
      id: item.id,
      position: item.position,
      size: item.size,
      zIndex: item.zIndex,
      isOpen: item.isOpen,
      isMinimized: item.isMinimized,
      isMaximized: item.isMaximized,
    }));
    saveLayout(payload);
    return () => saveLayout.cancel();
  }, [saveLayout, windows]);

  const cascadeWindows = () => {
    const openIds = windows.filter((item) => item.isOpen).map((item) => item.id);
    const next = cascadeLayout(openIds);
    setWindows((prev) =>
      prev.map((item) => {
        const found = next.find((layout) => layout.id === item.id);
        return found
          ? { ...item, position: found.position, isMaximized: false, restore: undefined }
          : item;
      })
    );
  };

  const tileWindows = () => {
    const openIds = windows.filter((item) => item.isOpen).map((item) => item.id);
    const next = tileLayout(openIds, window.innerWidth, window.innerHeight - 120);
    setWindows((prev) =>
      prev.map((item) => {
        const found = next.find((layout) => layout.id === item.id);
        return found
          ? {
              ...item,
              position: found.position,
              size: found.size,
              isMaximized: false,
              restore: undefined,
            }
          : item;
      })
    );
  };

  const handleContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (
      target.closest(".window") ||
      target.closest(".taskbar") ||
      target.closest(".start-menu")
    ) {
      return;
    }
    event.preventDefault();
    setContextMenu({ open: true, x: event.clientX, y: event.clientY });
  };

  const openWindows = windowConfigs.filter((config) => {
    const state = windowsMap.get(config.id);
    return state?.isOpen;
  });

  const activeOpen = windows.filter((item) => item.isOpen && !item.isMinimized);
  const activeId = activeOpen.length
    ? activeOpen.reduce((top, item) => (item.zIndex >= top.zIndex ? item : top))
        .id
    : undefined;

  const ethfolioAction: { type: "window"; target: string } | { type: "route"; target: string } =
    mainId === "ethfolio"
      ? { type: "window", target: "ethfolio" }
      : { type: "route", target: "/dashboard" };

  const icons: DesktopIcon[] = [
    {
      id: "ethfolio",
      label: "Ethfolio",
      variant: "app",
      action: ethfolioAction,
    },
    {
      id: "computer",
      label: "My Computer",
      variant: "pc",
      action: { type: "window", target: "computer" },
    },
    {
      id: "network",
      label: "Network",
      variant: "network",
      action: { type: "window", target: "network" },
    },
    {
      id: "docs",
      label: "My Docs",
      variant: "docs",
      action: { type: "window", target: "docs" },
    },
    {
      id: "recycle",
      label: "Recycle Bin",
      variant: "recycle",
      action: { type: "window", target: "recycle" },
    },
  ];

  const startLeft: StartMenuItem[] = [
    {
      id: "start-ethfolio",
      label: "Ethfolio",
      description: "Открыть портфель",
      icon: "/icons/xp/eth.svg",
      action: ethfolioAction,
    },
    {
      id: "start-sync",
      label: "Sync Center",
      description: "Синхронизация кошелька",
      icon: "/icons/xp/programs.png",
      action: { type: "window", target: "sync" },
    },
    {
      id: "start-settings",
      label: "Settings",
      description: "Кошелек и интерфейс",
      icon: "/icons/xp/monitor.png",
      action: { type: "window", target: "settings" },
    },
    {
      id: "start-notepad",
      label: "Notepad",
      description: "Заметки",
      icon: "/icons/xp/docs.png",
      action: { type: "window", target: "notepad" },
    },
    {
      id: "start-calculator",
      label: "Calculator",
      description: "Быстрые расчеты",
      icon: "/icons/xp/window.png",
      action: { type: "window", target: "calculator" },
    },
  ];

  const startRight: StartMenuItem[] = [
    {
      id: "start-docs",
      label: "My Documents",
      description: "Файлы пользователя",
      icon: "/icons/xp/folder.png",
      action: { type: "window", target: "docs" },
    },
    {
      id: "start-internet",
      label: "Internet",
      description: "Сеть и браузер",
      icon: "/icons/xp/internet.png",
      action: { type: "window", target: "network" },
    },
    {
      id: "start-computer",
      label: "My Computer",
      description: "Системные ресурсы",
      icon: "/icons/xp/my-computer.png",
      action: { type: "window", target: "computer" },
    },
    {
      id: "start-network",
      label: "Network",
      description: "Сетевые подключения",
      icon: "/icons/xp/network.png",
      action: { type: "window", target: "network" },
    },
    {
      id: "start-control",
      label: "Control Panel",
      description: "Системные настройки",
      icon: "/icons/xp/monitor.png",
      action: { type: "window", target: "control-panel" },
    },
    {
      id: "start-recycle",
      label: "Recycle Bin",
      description: "Корзина",
      icon: "/icons/xp/recycle.png",
      action: { type: "window", target: "recycle" },
    },
    {
      id: "start-about",
      label: "About",
      description: "О программе",
      icon: "/icons/xp/window.png",
      action: { type: "window", target: "about" },
    },
  ];

  const programItems: StartMenuItem[] = [
    {
      id: "program-ethfolio",
      label: "Ethfolio",
      description: "Основное окно",
      icon: "/icons/xp/eth.svg",
      action: ethfolioAction,
    },
    {
      id: "program-notepad",
      label: "Notepad",
      description: "Заметки",
      icon: "/icons/xp/docs.png",
      action: { type: "window", target: "notepad" },
    },
    {
      id: "program-calculator",
      label: "Calculator",
      description: "Калькулятор",
      icon: "/icons/xp/window.png",
      action: { type: "window", target: "calculator" },
    },
    {
      id: "program-clock",
      label: "Clock",
      description: "Часы",
      icon: "/icons/xp/monitor.png",
      action: { type: "window", target: "clock" },
    },
    {
      id: "program-control",
      label: "Control Panel",
      description: "Системные настройки",
      icon: "/icons/xp/monitor.png",
      action: { type: "window", target: "control-panel" },
    },
    {
      id: "program-settings",
      label: "Settings",
      description: "Кошелек и интерфейс",
      icon: "/icons/xp/monitor.png",
      action: { type: "window", target: "settings" },
    },
  ];

  return (
    <div
      className="desktop-root"
      onClick={() => {
        setStartOpen(false);
        setContextMenu((prev) => ({ ...prev, open: false }));
      }}
      onContextMenu={handleContextMenu}
    >
      <div className="desktop-wallpaper" aria-hidden />
      <DesktopIcons icons={icons} onOpenWindow={openWindow} />
      <div className="desktop-windows">
        {openWindows.map((config) => {
          const state = windowsMap.get(config.id);
          if (!state) {
            return null;
          }
          return (
            <Window
              key={config.id}
              id={config.id}
              title={config.title}
              subtitle={config.subtitle}
              icon={config.icon}
              isMinimized={state.isMinimized}
              isMaximized={state.isMaximized}
              restore={state.restore}
              zIndex={state.zIndex}
              position={state.position}
              size={state.size}
              canClose={config.canClose}
              onClose={closeWindow}
              onMinimize={toggleMinimize}
              onMaximize={toggleMaximize}
              onRestoreFromMaximize={(id, position, size) => {
                setWindows((prev) =>
                  prev.map((item) =>
                    item.id === id
                      ? {
                          ...item,
                          isMaximized: false,
                          position,
                          size,
                          restore: undefined,
                          zIndex: ++zCounter.current,
                        }
                      : item
                  )
                );
              }}
              onFocus={focusWindow}
              onPositionChange={updatePosition}
              onSizeChange={updateSize}
            >
              {config.content}
            </Window>
          );
        })}
      </div>
      {contextMenu.open ? (
        <div
          className="desktop-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            className="desktop-menu-item"
            type="button"
            onClick={() => {
              playSound("click");
              cascadeWindows();
              setContextMenu((prev) => ({ ...prev, open: false }));
            }}
          >
            Cascade Windows
          </button>
          <button
            className="desktop-menu-item"
            type="button"
            onClick={() => {
              playSound("click");
              tileWindows();
              setContextMenu((prev) => ({ ...prev, open: false }));
            }}
          >
            Tile Windows
          </button>
          <div className="desktop-menu-divider" />
          <button
            className="desktop-menu-item"
            type="button"
            onClick={() => {
              playSound("click");
              openWindow("sync");
              setContextMenu((prev) => ({ ...prev, open: false }));
            }}
          >
            Sync Center
          </button>
          <button
            className="desktop-menu-item"
            type="button"
            onClick={() => {
              playSound("click");
              openWindow("settings");
              setContextMenu((prev) => ({ ...prev, open: false }));
            }}
          >
            Settings
          </button>
          <button
            className="desktop-menu-item"
            type="button"
            onClick={() => {
              playSound("click");
              if (ethfolioAction.type === "window") {
                openWindow(ethfolioAction.target);
              } else {
                router.push(ethfolioAction.target);
              }
              setContextMenu((prev) => ({ ...prev, open: false }));
            }}
          >
            Open Portfolio
          </button>
        </div>
      ) : null}
      <StartMenu
        open={startOpen}
        leftItems={startLeft}
        rightItems={startRight}
        programItems={programItems}
        onCascade={cascadeWindows}
        onTile={tileWindows}
        onClose={() => setStartOpen(false)}
        onOpenWindow={openWindow}
        userEmail={userEmail}
      />
      <Taskbar
        windows={openWindows.map((config) => {
          const state = windowsMap.get(config.id)!;
          return {
            id: config.id,
            title: config.title,
            isMinimized: state.isMinimized,
            icon: config.icon,
          };
        })}
        activeId={activeId}
        startOpen={startOpen}
        onToggleStart={() => setStartOpen((prev) => !prev)}
        onToggleWindow={toggleMinimize}
        onCascade={cascadeWindows}
        onTile={tileWindows}
        userEmail={userEmail ?? undefined}
        onOpenAccount={() => openWindow("account")}
      />
    </div>
  );
}
