const databaseName = "easyimmerse";
const storeName = "preferences";

export type PreferenceStore = {
  save(key: string, value: string): Promise<void>;
  load(key: string): Promise<string | null>;
};

/** Persists preferences in the browser's IndexedDB. The database opens on first use. */
export function createPreferenceStore(): PreferenceStore {
  let database: Promise<IDBDatabase> | null = null;
  const open = () => {
    database ??= openDatabase();
    return database;
  };
  return {
    save: async (key, value) => {
      await request(writableStore(await open()).put(value, key));
    },
    load: async (key) => {
      const value = await request(readableStore(await open()).get(key));
      return typeof value === "string" ? value : null;
    },
  };
}

function openDatabase(): Promise<IDBDatabase> {
  const opening = indexedDB.open(databaseName, 1);
  opening.addEventListener("upgradeneeded", () => {
    opening.result.createObjectStore(storeName);
  });
  return request(opening);
}

function readableStore(database: IDBDatabase): IDBObjectStore {
  return database.transaction(storeName, "readonly").objectStore(storeName);
}

function writableStore(database: IDBDatabase): IDBObjectStore {
  return database.transaction(storeName, "readwrite").objectStore(storeName);
}

/** Turns an IndexedDB request into a promise of its result. */
function request<T>(idbRequest: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    idbRequest.addEventListener("success", () => resolve(idbRequest.result));
    idbRequest.addEventListener("error", () => reject(idbRequest.error));
  });
}
