import { describe, expect, it } from "vitest";
import { getAdminGuard } from "../adminGuard";

describe("getAdminGuard", () => {
  it("returns 401 when session missing", () => {
    expect(getAdminGuard(null)).toEqual({ status: 401, error: "Unauthorized" });
  });

  it("returns 403 when not admin", () => {
    expect(
      getAdminGuard({ user: { id: "1", email: "a@b.com", role: "USER" } })
    ).toEqual({ status: 403, error: "Forbidden" });
  });

  it("returns null when admin", () => {
    expect(
      getAdminGuard({ user: { id: "1", email: "a@b.com", role: "ADMIN" } })
    ).toBeNull();
  });
});
