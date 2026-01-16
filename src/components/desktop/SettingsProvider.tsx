"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { migrateStorageKey } from "@/lib/storage";

type ThemeMode = "light" | "dark";

type SettingsState = {
  theme: ThemeMode;
  soundEnabled: boolean;
};

type SettingsContextValue = SettingsState & {
  toggleTheme: () => void;
  toggleSound: () => void;
  playSound: (
    name: "click" | "notify" | "startup" | "shutdown" | "start" | "minimize" | "restore"
  ) => Promise<void>;
};

const LEGACY_STORAGE_KEY = "ethfolio.settings";
const STORAGE_KEY = "retrodesk.settings";

const SettingsContext = createContext<SettingsContextValue | null>(null);

const defaultSettings: SettingsState = {
  theme: "light",
  soundEnabled: true,
};

function loadSettings(): SettingsState {
  if (typeof window === "undefined") {
    return defaultSettings;
  }

  try {
    const parsed = migrateStorageKey<Partial<SettingsState>>({
      storage: window.localStorage,
      oldKey: LEGACY_STORAGE_KEY,
      newKey: STORAGE_KEY,
    });
    if (!parsed) {
      return defaultSettings;
    }
    return {
      theme: parsed.theme === "dark" ? "dark" : "light",
      soundEnabled: typeof parsed.soundEnabled === "boolean" ? parsed.soundEnabled : true,
    };
  } catch {
    return defaultSettings;
  }
}

export default function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [hydrated, setHydrated] = useState(false);
  const [audioReady, setAudioReady] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    document.documentElement.dataset.theme = settings.theme;
  }, [hydrated, settings]);

  useEffect(() => {
    const handler = () => setAudioReady(true);
    window.addEventListener("pointerdown", handler, { once: true });
    return () => window.removeEventListener("pointerdown", handler);
  }, []);

  const playFallbackBeep = useCallback(() => {
    if (!audioReady) {
      return;
    }
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "square";
    oscillator.frequency.value = 520;
    gain.gain.value = 0.03;
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.08);
    oscillator.onended = () => context.close();
  }, [audioReady]);

  const playSound = useCallback(
    async (
      name: "click" | "notify" | "startup" | "shutdown" | "start" | "minimize" | "restore"
    ) => {
      if (!settings.soundEnabled || !audioReady) {
        return;
      }
      const sources: Record<string, string | null> = {
        click: null,
        notify: null,
        startup: "/sounds/win-xp/windows-xp-startup.mp3",
        shutdown: "/sounds/win-xp/windows-xp-shutdown.mp3",
        start: "/sounds/win-xp/windows-navigation-start.mp3",
        minimize: "/sounds/win-xp/windows-xp-minimize.mp3",
        restore: "/sounds/win-xp/windows-xp-restore.mp3",
      };
      const source = sources[name];
      if (!source) {
        if (name === "click" || name === "notify") {
          return;
        }
        playFallbackBeep();
        return;
      }

      await new Promise<void>((resolve) => {
        const audio = new Audio(source);
        audio.volume = 0.6;
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.onabort = () => resolve();
        audio.play().catch(() => {
          playFallbackBeep();
          resolve();
        });
      });
    },
    [audioReady, playFallbackBeep, settings.soundEnabled]
  );


  const value = useMemo<SettingsContextValue>(
    () => ({
      ...settings,
      toggleTheme: () =>
        setSettings((prev) => ({
          ...prev,
          theme: prev.theme === "light" ? "dark" : "light",
        })),
      toggleSound: () =>
        setSettings((prev) => ({
          ...prev,
          soundEnabled: !prev.soundEnabled,
        })),
      playSound,
    }),
    [playSound, settings]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return context;
}
