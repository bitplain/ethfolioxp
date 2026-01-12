import { getLoginSuccessRedirect, getLogoutRedirect } from "../authNavigation";

test("getLoginSuccessRedirect returns dashboard path", () => {
  expect(getLoginSuccessRedirect()).toBe("/dashboard");
});

test("getLogoutRedirect uses returned url", () => {
  const result = { url: "/login?from=signout" };
  expect(getLogoutRedirect(result)).toBe("/login?from=signout");
});

test("getLogoutRedirect normalizes absolute urls", () => {
  const result = { url: "https://example.com/login?from=signout" };
  expect(getLogoutRedirect(result)).toBe("/login?from=signout");
});

test("getLogoutRedirect falls back when url missing", () => {
  expect(getLogoutRedirect(undefined)).toBe("/login");
  expect(getLogoutRedirect({ url: "" })).toBe("/login");
});
