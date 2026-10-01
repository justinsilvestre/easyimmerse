const databaseName = "easyimmerse";
const databaseVersion = 2;

/** Names the object stores in the app's IndexedDB database. */
export const appStoreNames = {
  preferences: "preferences",
  files: "files",
} as const;

type AppStoreName = (typeof appStoreNames)[keyof typeof appStoreNames];

/**
 * Opens the app's IndexedDB database, creating any object store that an earlier version lacked.
 * The connection closes itself when a newer version of the app needs to upgrade the database.
 */
export async function openAppDatabase(): Promise<IDBDatabase> {
  const opening = indexedDB.open(databaseName, databaseVersion);
  opening.addEventListener("upgradeneeded", () =>
    createMissingStores(opening.result),
  );
  const database = await request(opening);
  database.addEventListener("versionchange", () => database.close());
  return database;
}

/** Returns a function that opens the app database on its first call and reuses the connection afterwards. */
export function openAppDatabaseOnFirstUse(): () => Promise<IDBDatabase> {
  let database: Promise<IDBDatabase> | null = null;
  return () => {
    database ??= openAppDatabase();
    return database;
  };
}

/** Starts a transaction on one object store and returns that store. */
export function openObjectStore(
  database: IDBDatabase,
  name: AppStoreName,
  mode: IDBTransactionMode,
): IDBObjectStore {
  return database.transaction(name, mode).objectStore(name);
}

/** Turns an IndexedDB request into a promise of its result. */
export function request<T>(idbRequest: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    idbRequest.addEventListener("success", () => resolve(idbRequest.result));
    idbRequest.addEventListener("error", () => reject(idbRequest.error));
  });
}

/** Resolves once the transaction commits, and rejects if it aborts, as when storage runs out. */
export function commit(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve());
    transaction.addEventListener("abort", () => reject(transaction.error));
  });
}

function createMissingStores(database: IDBDatabase): void {
  for (const name of Object.values(appStoreNames)) {
    if (!database.objectStoreNames.contains(name))
      database.createObjectStore(name);
  }
}
