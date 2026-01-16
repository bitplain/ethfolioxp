type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

type MigrateArgs<T> = {
  storage: StorageLike;
  oldKey: string;
  newKey: string;
  parse?: (raw: string) => T;
  serialize?: (value: T) => string;
};

export function migrateStorageKey<T>({
  storage,
  oldKey,
  newKey,
  parse = JSON.parse,
  serialize = JSON.stringify,
}: MigrateArgs<T>): T | null {
  const raw = storage.getItem(newKey) ?? storage.getItem(oldKey);
  if (!raw) {
    return null;
  }
  const value = parse(raw) as T;
  storage.setItem(newKey, serialize(value));
  if (oldKey !== newKey) {
    storage.removeItem(oldKey);
  }
  return value;
}
