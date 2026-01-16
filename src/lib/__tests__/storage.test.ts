import { expect, test } from "vitest";
import { migrateStorageKey } from "@/lib/storage";

test("migrateStorageKey moves old value to new key", () => {
  const storage = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => (key in store ? store[key] : null),
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
    };
  })();

  storage.setItem("ethfolio.settings", JSON.stringify({ theme: "light" }));

  const value = migrateStorageKey({
    storage,
    oldKey: "ethfolio.settings",
    newKey: "retrodesk.settings",
  });

  expect(value).toEqual({ theme: "light" });
  expect(storage.getItem("retrodesk.settings")).toBe(
    JSON.stringify({ theme: "light" })
  );
  expect(storage.getItem("ethfolio.settings")).toBe(null);
});
