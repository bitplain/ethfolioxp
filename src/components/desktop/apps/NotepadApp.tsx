"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "ethfolio.notepad";

export default function NotepadApp() {
  const [value, setValue] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
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
