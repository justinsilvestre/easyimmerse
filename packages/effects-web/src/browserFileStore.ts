/** Holds files the user picked in the browser, by a random key that can stand in for the file elsewhere. */
export type BrowserFileStore = {
  /** Stores the file and returns its key. */
  put(file: File): string;
  get(key: string): File | undefined;
};

/** Builds a store that keeps files in memory, so they are gone once the page reloads. */
export function createBrowserFileStore(): BrowserFileStore {
  const files = new Map<string, File>();
  return {
    put: (file) => {
      const key = crypto.randomUUID();
      files.set(key, file);
      return key;
    },
    get: (key) => files.get(key),
  };
}
