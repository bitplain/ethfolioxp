"use client";

import { useEffect, useState } from "react";

export default function ClockApp() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="stack">
      <div className="panel-title">System Clock</div>
      <div className="clock-face">
        <div className="clock-time">
          {now.toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </div>
        <div className="muted">
          {now.toLocaleDateString("ru-RU", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </div>
    </div>
  );
}
