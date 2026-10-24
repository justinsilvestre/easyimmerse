import type { BrowserFileRegistry, PickedMediaFile } from "@easyimmerse/state";

/** The failure of an upload on a platform whose files are not held by a browser. */
export const unreachableFile = {
  status: 404,
  code: "browserFileUnreachable",
  message: "",
};

/**
 * Holds a file the manager picked in the browser's file registry while `upload` reads it from there,
 * then lets go of it, unless the registry held it already for something else.
 */
export async function uploadFromRegistry<T>(
  registry: BrowserFileRegistry<File>,
  file: File,
  upload: (picked: PickedMediaFile) => Promise<T>,
): Promise<T> {
  const source = {
    kind: "browser_file",
    size: file.size,
    last_modified_ms: file.lastModified,
  } as const;
  const wasHeld = registry.find(file.name, source) !== null;
  const picked = { name: file.name, source: registry.register(file) };
  try {
    return await upload(picked);
  } finally {
    if (!wasHeld) registry.unregister(file);
  }
}
