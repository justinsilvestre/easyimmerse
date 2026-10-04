import type { MediaFileSource } from "@easyimmerse/types";

/** What a browser `File` reports about itself, which is also what the backend stores for a `browser_file` source. */
export type HeldFile = { name: string; size: number; lastModified: number };

export type BrowserFileRegistry<F extends HeldFile = HeldFile> = {
  /** Keeps the file and returns the source that describes it to the backend. */
  register(file: F): MediaFileSource;
  /** Returns the held file whose name, size, and modification time match a media file's, or null. */
  find(name: string, source: MediaFileSource): F | null;
};

/**
 * Holds the files the web app picked, outside the store, since a `File` cannot be serialized.
 * A media file with a `browser_file` source finds its bytes here while the page lives.
 */
export function createBrowserFileRegistry<
  F extends HeldFile = HeldFile,
>(): BrowserFileRegistry<F> {
  const files = new Map<string, F>();
  return {
    register: (file) => {
      files.set(keyOf(file.name, file.size, file.lastModified), file);
      return {
        kind: "browser_file",
        size: file.size,
        last_modified_ms: file.lastModified,
      };
    },
    find: (name, source) => {
      if (source.kind !== "browser_file") return null;
      return (
        files.get(keyOf(name, source.size, source.last_modified_ms)) ?? null
      );
    },
  };
}

function keyOf(name: string, size: number, lastModified: number): string {
  return `${size}:${lastModified}:${name}`;
}
