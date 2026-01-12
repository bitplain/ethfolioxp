import { UserSettings } from "@prisma/client";
import { prisma } from "./db";
import { decryptSecret } from "./crypto";

export type ApiKeyEntry = { name: string; value: string };

type DecryptedSettings = Omit<
  UserSettings,
  "etherscanApiKey" | "moralisApiKey" | "apiKeys"
> & {
  etherscanApiKey: string | null;
  moralisApiKey: string | null;
  apiKeys: ApiKeyEntry[];
};

function parseApiKeys(raw: unknown): ApiKeyEntry[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const name = String((entry as ApiKeyEntry).name || "").trim();
      const value = String((entry as ApiKeyEntry).value || "").trim();
      if (!name || !value) {
        return null;
      }
      const decrypted = decryptSecret(value);
      if (!decrypted) {
        return null;
      }
      return { name, value: decrypted };
    })
    .filter(Boolean) as ApiKeyEntry[];
}

export async function getUserSettings(
  userId: string
): Promise<DecryptedSettings | null> {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
  });

  if (!settings) {
    return null;
  }

  return {
    ...settings,
    etherscanApiKey: decryptSecret(settings.etherscanApiKey ?? null),
    moralisApiKey: decryptSecret(settings.moralisApiKey ?? null),
    apiKeys: parseApiKeys(settings.apiKeys),
  };
}
