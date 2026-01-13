import { postJson } from "@/lib/http";

type PostJson = typeof postJson;

type RunSyncOptions = {
  request?: PostJson;
  onSuccess?: () => void;
};

export async function runSync({ request = postJson, onSuccess }: RunSyncOptions) {
  try {
    const result = await request("/api/sync");
    if (!result.ok) {
      const errorMessage =
        result.data.error ||
        (result.error
          ? "Ошибка сети. Проверь соединение."
          : "Ошибка синхронизации");
      return { ok: false, message: errorMessage };
    }

    const created =
      typeof result.data.created === "number" ? result.data.created : 0;
    onSuccess?.();
    return { ok: true, message: `Синхронизировано: +${created} записей.` };
  } catch {
    return { ok: false, message: "Ошибка сети. Проверь соединение." };
  }
}
