import type { BrowserFileRegistry } from "@easyimmerse/state";
import type { MediaFile, MediaFileSource } from "@easyimmerse/types";
import type { BackendError } from "./backendClient.ts";

/** A file a browser picked, named as its media file names it. */
export type PickedFile = Pick<MediaFile, "name" | "source">;

/** The bytes of a picked file, or the failure that says why they cannot be read. */
export type PickedFileBytes = { bytes: Uint8Array } | { error: BackendError };

/** The failure for a file a browser added, on a platform that holds no browser files. */
export const browserFileUnreachable: BackendError = {
  status: 404,
  code: "browserFileUnreachable",
  message: "This app holds no files added in a web browser.",
};

/** The failure for a file a browser added and no longer holds. */
const browserFileGone: BackendError = {
  status: 404,
  code: "browserFileGone",
  message: "The browser no longer holds this file.",
};

/** Finds a file that a browser picked and still holds. */
export function findPickedFile(
  file: PickedFile,
  browserFileRegistry: BrowserFileRegistry<File> | null,
): { file: File } | { error: BackendError } {
  if (browserFileRegistry === null) return { error: browserFileUnreachable };
  const held = browserFileRegistry.find(file.name, file.source);
  return held === null ? { error: browserFileGone } : { file: held };
}

/** Whether two picked files name the same file. */
export function isSamePickedFile(a: PickedFile, b: PickedFile): boolean {
  return a.name === b.name && sourceKeyOf(a.source) === sourceKeyOf(b.source);
}

function sourceKeyOf(source: MediaFileSource): string {
  return source.kind === "path"
    ? `path:${source.path}`
    : `browser:${source.size}:${source.last_modified_ms}`;
}

/** Reads the bytes of a file that a browser picked and still holds. */
export async function readPickedFile(
  file: PickedFile,
  browserFileRegistry: BrowserFileRegistry<File> | null,
): Promise<PickedFileBytes> {
  const found = findPickedFile(file, browserFileRegistry);
  if ("error" in found) return found;
  return found.file.arrayBuffer().then(
    (buffer) => ({ bytes: new Uint8Array(buffer) }),
    (error: unknown) => ({ error: unreadable(error) }),
  );
}

function unreadable(error: unknown): BackendError {
  const message = error instanceof Error ? error.message : String(error);
  return { status: 400, code: "browserFileUnreadable", message };
}
