import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { validateSecretValue } from "./config";

const PREFIX = "enc:v1:";

function getKey() {
  const secret = process.env.KEYS_ENCRYPTION_SECRET || process.env.NEXTAUTH_SECRET;
  if (!validateSecretValue(secret).ok) {
    return null;
  }
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(value: string) {
  const key = getKey();
  if (!key) {
    throw new Error("Missing encryption secret.");
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptSecret(value: string | null) {
  if (!value) {
    return null;
  }
  if (!value.startsWith(PREFIX)) {
    return value;
  }
  const key = getKey();
  if (!key) {
    return null;
  }
  const payload = value.slice(PREFIX.length);
  const [ivB64, tagB64, dataB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !dataB64) {
    return null;
  }
  try {
    const iv = Buffer.from(ivB64, "base64");
    const tag = Buffer.from(tagB64, "base64");
    const data = Buffer.from(dataB64, "base64");
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}
