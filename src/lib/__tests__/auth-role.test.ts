import { describe, expect, it } from "vitest";
import { authOptions } from "../auth";

describe("auth role propagation", () => {
  it("adds role to token when user has role", async () => {
    const callbacks = authOptions.callbacks;
    expect(callbacks?.jwt).toBeDefined();
    const token = await callbacks!.jwt!({
      token: {},
      user: { role: "ADMIN" } as { role: "ADMIN" | "USER" },
    });
    expect((token as { role?: string }).role).toBe("ADMIN");
  });

  it("adds role to session from token", async () => {
    const callbacks = authOptions.callbacks;
    const session = { user: { id: "", email: "a@b.com" } } as {
      user: { id: string; email: string; role?: "ADMIN" | "USER" };
    };
    const token = { sub: "user-1", role: "ADMIN" } as {
      sub: string;
      role: "ADMIN" | "USER";
    };
    const result = await callbacks!.session!({ session, token });
    expect(result.user.id).toBe("user-1");
    expect(result.user.role).toBe("ADMIN");
  });
});
