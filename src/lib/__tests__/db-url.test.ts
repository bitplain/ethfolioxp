import { describe, expect, it, vi } from "vitest";
import { getDatabaseUrl } from "../db-url";

describe("getDatabaseUrl", () => {
  it("throws when DATABASE_URL is missing", () => {
    vi.stubEnv("DATABASE_URL", undefined);
    expect(() => getDatabaseUrl()).toThrow("DATABASE_URL is required");
  });
});
