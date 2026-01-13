const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function validateEmail(value: string): ValidationResult<string> {
  const email = value.trim().toLowerCase();
  if (!email || email.length > 320 || !EMAIL_RE.test(email)) {
    return { ok: false, error: "Invalid email." };
  }
  return { ok: true, value: email };
}

export function validatePassword(value: string): ValidationResult<string> {
  const password = value.trim();
  const rules = [
    password.length >= 10,
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^a-zA-Z0-9]/.test(password),
  ];
  if (!rules.every(Boolean)) {
    return { ok: false, error: "Weak password." };
  }
  return { ok: true, value: password };
}
