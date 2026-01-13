import { describe, expect, test } from "vitest";
import { validateEmail, validatePassword } from "@/lib/validation";

describe("validateEmail", () => {
  test("rejects invalid email and accepts valid", () => {
    expect(validateEmail("nope").ok).toBe(false);
    expect(validateEmail("user@example.com").ok).toBe(true);
  });
});

describe("validatePassword", () => {
  test("enforces length and character diversity", () => {
    expect(validatePassword("short").ok).toBe(false);
    expect(validatePassword("alllowercasebutlong").ok).toBe(false);
    expect(validatePassword("Valid1234!").ok).toBe(true);
  });
});
