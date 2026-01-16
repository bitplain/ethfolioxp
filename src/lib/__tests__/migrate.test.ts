import { describe, expect, it, vi } from "vitest";
import { isAutoMigrateEnabled, shouldRetryMigration } from "../migrate";

describe("shouldRetryMigration", () => {
  it("returns true for unreachable database error", () => {
    expect(shouldRetryMigration("Can't reach database server at `db:5432`")).toBe(true);
  });

  it("returns false for other errors", () => {
    expect(shouldRetryMigration("permission denied")).toBe(false);
  });
});

describe("isAutoMigrateEnabled", () => {
  it("is disabled when AUTO_MIGRATE=0", () => {
    vi.stubEnv("AUTO_MIGRATE", "0");
    vi.stubEnv("NODE_ENV", "production");
    expect(isAutoMigrateEnabled()).toBe(false);
  });

  it("is enabled by default", () => {
    vi.stubEnv("AUTO_MIGRATE", undefined);
    vi.stubEnv("NODE_ENV", "production");
    expect(isAutoMigrateEnabled()).toBe(true);
  });
});
