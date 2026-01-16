import { describe, expect, it } from "vitest";
import { roleForFirstUser } from "../roles";

describe("roleForFirstUser", () => {
  it("returns ADMIN when no users exist", () => {
    expect(roleForFirstUser(0)).toBe("ADMIN");
  });

  it("returns USER when users exist", () => {
    expect(roleForFirstUser(1)).toBe("USER");
  });
});
