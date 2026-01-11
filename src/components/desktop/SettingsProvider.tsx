"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type ThemeMode = "light" | "dark";

type SettingsState = {
  theme: ThemeMode;
  soundEnabled: boolean;
};

type SettingsContextValue = SettingsState & {
  toggleTheme: () => void;
  toggleSound: () => void;
  playSound: (name: "click" | "startup" | "notify") => void;
};

const STORAGE_KEY = "ethfolio.settings";

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
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultSettings;
    }
    const parsed = JSON.parse(raw) as Partial<SettingsState>;
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
  const [startupPlayed, setStartupPlayed] = useState(false);

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
    (name: "click" | "startup" | "notify") => {
      if (!settings.soundEnabled || !audioReady) {
        return;
      }
      const audio = new Audio(`/sounds/xp-${name}.wav`);
      audio.volume = 0.6;
      audio.play().catch(() => playFallbackBeep());
    },
    [audioReady, playFallbackBeep, settings.soundEnabled]
  );

  useEffect(() => {
    if (!audioReady || startupPlayed || !settings.soundEnabled) {
      return;
    }
    playSound("startup");
    setStartupPlayed(true);
  }, [audioReady, playSound, settings.soundEnabled, startupPlayed]);

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
