export const LOGIN_SUCCESS_REDIRECT = "/dashboard";
export const LOGOUT_FALLBACK_REDIRECT = "/login";

type SignOutResult = { url?: string | null } | undefined;

export function getLoginSuccessRedirect() {
  return LOGIN_SUCCESS_REDIRECT;
}

export function getLogoutRedirect(
  result: SignOutResult,
  fallback = LOGOUT_FALLBACK_REDIRECT
) {
  const rawUrl = result?.url?.trim();
  if (!rawUrl) {
    return fallback;
  }
  try {
    const parsed = new URL(rawUrl, "http://localhost");
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
