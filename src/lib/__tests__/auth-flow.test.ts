import { handleLoginSuccessFlow, handleLogoutFlow } from "../authFlow";
import { vi } from "vitest";

test("handleLoginSuccessFlow navigates without waiting for sound", () => {
  const calls: string[] = [];
  const playSound = vi.fn(() => {
    calls.push("sound");
    return new Promise<void>(() => {});
  });
  const navigate = vi.fn((path: string) => {
    calls.push(`nav:${path}`);
  });

  handleLoginSuccessFlow({ playSound, navigate });

  expect(playSound).toHaveBeenCalledWith("startup");
  expect(calls).toEqual(["sound", "nav:/dashboard"]);
});

test("handleLogoutFlow signs out and navigates after triggering sound", async () => {
  const calls: string[] = [];
  const playSound = vi.fn(() => {
    calls.push("sound");
    return new Promise<void>(() => {});
  });
  const signOut = vi.fn(async () => {
    calls.push("signOut");
    return { url: "/login" };
  });
  const navigate = vi.fn((path: string) => {
    calls.push(`nav:${path}`);
  });

  await handleLogoutFlow({ playSound, signOut, navigate });

  expect(playSound).toHaveBeenCalledWith("shutdown");
  expect(signOut).toHaveBeenCalledWith({ redirect: false, callbackUrl: "/login" });
  expect(calls).toEqual(["sound", "signOut", "nav:/login"]);
});
