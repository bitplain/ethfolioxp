const PLACEHOLDER = "replace-with-strong-secret";

export function validateSecretValue(value: string | undefined) {
  if (!value || value.trim().length < 16 || value.includes(PLACEHOLDER)) {
    return { ok: false };
  }
  return { ok: true };
}

export function assertSecureSecrets() {
  if (process.env.NODE_ENV !== "production") {
    return;
  }
  const nextAuth = validateSecretValue(process.env.NEXTAUTH_SECRET);
  const keys = validateSecretValue(
    process.env.KEYS_ENCRYPTION_SECRET || process.env.NEXTAUTH_SECRET
  );
  if (!nextAuth.ok || !keys.ok) {
    throw new Error("Missing or weak secrets in production.");
  }
}
