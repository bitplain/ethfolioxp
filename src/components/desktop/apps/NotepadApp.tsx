"use client";

import { useEffect, useState } from "react";
import { migrateStorageKey } from "@/lib/storage";

const LEGACY_STORAGE_KEY = "ethfolio.notepad";
const STORAGE_KEY = "retrodesk.notepad";

export default function NotepadApp() {
  const [value, setValue] = useState("");

  useEffect(() => {
    const saved = migrateStorageKey<string>({
      storage: window.localStorage,
      oldKey: LEGACY_STORAGE_KEY,
      newKey: STORAGE_KEY,
      parse: (raw) => raw,
      serialize: (next) => next,
    });
    if (saved) {
      setValue(saved);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, value);
  }, [value]);

  return (
    <div className="stack">
      <div className="panel-title">Notepad</div>
      <textarea
        className="xp-textarea"
        rows={10}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Ваши заметки..."
      />
    </div>
  );
}
