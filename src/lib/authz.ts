import type { Session } from "next-auth";

export function isAdminSession(session: Session | null | undefined) {
  return session?.user?.role === "ADMIN";
}
