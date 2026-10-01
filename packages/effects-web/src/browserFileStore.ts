import {
  appStoreNames,
  commit,
  openAppDatabaseOnFirstUse,
  openObjectStore,
  request,
} from "./openAppDatabase.ts";

/** Describes a stored file without loading its contents. */
export type StoredFileSummary = { key: string; name: string; size: number };

/** Keeps files the user picked in the browser, by a random key that can stand in for the file elsewhere. */
export type BrowserFileStore = {
  /** Stores the file and resolves its new key. */
  put(file: File): Promise<string>;
  /** Resolves null for a key the store does not hold. */
  get(key: string): Promise<Blob | null>;
  delete(key: string): Promise<void>;
  list(): Promise<StoredFileSummary[]>;
  /** Resolves the combined size of the stored files in bytes. */
  totalBytes(): Promise<number>;
};

type StoredFile = { name: string; type: string; blob: Blob };

/** Builds a store that keeps files in the browser's IndexedDB, so they survive reloads. The database opens on first use. */
export function createBrowserFileStore(): BrowserFileStore {
  const open = openAppDatabaseOnFirstUse();
  const openStore = async (mode: IDBTransactionMode) =>
    openObjectStore(await open(), appStoreNames.files, mode);
  const list = async () => listStoredFiles(await openStore("readonly"));
  return {
    put: async (file) => {
      const key = crypto.randomUUID();
      const record: StoredFile = {
        name: file.name,
        type: file.type,
        blob: file,
      };
      const store = await openStore("readwrite");
      store.put(record, key);
      await commit(store.transaction);
      return key;
    },
    get: async (key) => {
      const record = await request((await openStore("readonly")).get(key));
      return (record as StoredFile | undefined)?.blob ?? null;
    },
    delete: async (key) => {
      await request((await openStore("readwrite")).delete(key));
    },
    list,
    totalBytes: async () =>
      (await list()).reduce((total, file) => total + file.size, 0),
  };
}

async function listStoredFiles(
  store: IDBObjectStore,
): Promise<StoredFileSummary[]> {
  const [keys, records] = await Promise.all([
    request(store.getAllKeys()),
    request(store.getAll() as IDBRequest<StoredFile[]>),
  ]);
  return records.map((record, index) => ({
    key: String(keys[index]),
    name: record.name,
    size: record.blob.size,
  }));
}
