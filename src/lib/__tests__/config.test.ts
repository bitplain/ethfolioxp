import { expect, test } from "vitest";
import { validateSecretValue } from "@/lib/config";

test("validateSecretValue rejects placeholders", () => {
  expect(validateSecretValue("replace-with-strong-secret").ok).toBe(false);
  expect(validateSecretValue("super-secret-value-123").ok).toBe(true);
});
