import type { Session } from "next-auth";

export function getAdminGuard(session: Session | null | undefined) {
  if (!session?.user?.id) {
    return { status: 401, error: "Unauthorized" } as const;
  }
  if (session.user.role !== "ADMIN") {
    return { status: 403, error: "Forbidden" } as const;
  }
  return null;
}
