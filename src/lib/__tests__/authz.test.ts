import { describe, expect, it } from "vitest";
import { isAdminSession } from "../authz";

describe("isAdminSession", () => {
  it("returns false for missing session", () => {
    expect(isAdminSession(null)).toBe(false);
  });

  it("returns false when role is not ADMIN", () => {
    expect(
      isAdminSession({ user: { id: "1", email: "a@b.com", role: "USER" } })
    ).toBe(false);
  });

  it("returns true when role is ADMIN", () => {
    expect(
      isAdminSession({ user: { id: "1", email: "a@b.com", role: "ADMIN" } })
    ).toBe(true);
  });
});
