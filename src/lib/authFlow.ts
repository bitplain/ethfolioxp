import { getLoginSuccessRedirect, getLogoutRedirect } from "./authNavigation";

type PlaySound = (
  name: "click" | "notify" | "startup" | "shutdown" | "start" | "minimize" | "restore"
) => Promise<void>;

type Navigate = (path: string) => void;

type SignOut = (options: {
  redirect: false;
  callbackUrl?: string;
}) => Promise<{ url?: string | null }>;

type LoginFlowOptions = {
  playSound: PlaySound;
  navigate: Navigate;
  redirect?: string;
};

type LogoutFlowOptions = {
  playSound: PlaySound;
  navigate: Navigate;
  signOut: SignOut;
  fallback?: string;
};

export function handleLoginSuccessFlow({
  playSound,
  navigate,
  redirect,
}: LoginFlowOptions) {
  void playSound("startup");
  navigate(redirect ?? getLoginSuccessRedirect());
}

export async function handleLogoutFlow({
  playSound,
  navigate,
  signOut,
  fallback,
}: LogoutFlowOptions) {
  void playSound("shutdown");
  const callbackUrl = fallback ?? "/login";
  const result = await signOut({ redirect: false, callbackUrl });
  navigate(getLogoutRedirect(result, fallback));
}
