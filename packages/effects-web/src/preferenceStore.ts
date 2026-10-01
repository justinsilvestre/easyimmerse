import {
  appStoreNames,
  openAppDatabaseOnFirstUse,
  openObjectStore,
  request,
} from "./openAppDatabase.ts";

export type PreferenceStore = {
  save(key: string, value: string): Promise<void>;
  load(key: string): Promise<string | null>;
};

/** Persists preferences in the browser's IndexedDB. The database opens on first use. */
export function createPreferenceStore(): PreferenceStore {
  const open = openAppDatabaseOnFirstUse();
  const openStore = async (mode: IDBTransactionMode) =>
    openObjectStore(await open(), appStoreNames.preferences, mode);
  return {
    save: async (key, value) => {
      await request((await openStore("readwrite")).put(value, key));
    },
    load: async (key) => {
      const value = await request((await openStore("readonly")).get(key));
      return typeof value === "string" ? value : null;
    },
  };
}
