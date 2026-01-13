"use client";

import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export default function OfflineBanner() {
  const online = useNetworkStatus();
  if (online) {
    return null;
  }
  return <div className="notice">Нет соединения. Действия недоступны.</div>;
}
