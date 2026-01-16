import { describe, expect, it, vi } from "vitest";
import { getClientIp } from "../request";

describe("getClientIp", () => {
  it("ignores x-forwarded-for when TRUST_PROXY is not set", () => {
    vi.stubEnv("TRUST_PROXY", undefined);
    const headers = { "x-forwarded-for": "1.1.1.1", "x-real-ip": "2.2.2.2" };
    expect(getClientIp(headers)).toBe("unknown");
  });

  it("uses x-forwarded-for when TRUST_PROXY=1", () => {
    vi.stubEnv("TRUST_PROXY", "1");
    const headers = { "x-forwarded-for": "1.1.1.1, 3.3.3.3" };
    expect(getClientIp(headers)).toBe("1.1.1.1");
  });
});
