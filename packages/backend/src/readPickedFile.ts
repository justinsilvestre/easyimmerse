import type { BrowserFileRegistry } from "@easyimmerse/state";
import type { MediaFileSource } from "@easyimmerse/types";
import type { BackendError } from "./backendClient.ts";

/** The bytes of a picked file, or the failure that says why they cannot be read. */
export type PickedFileBytes = { bytes: Uint8Array } | { error: BackendError };

/** The failure for a file a browser added, on a platform that holds no browser files. */
const browserFileUnreachable: BackendError = {
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

/** Reads the bytes of a file that a browser picked and still holds. */
export async function readPickedFile(
  file: { name: string; source: MediaFileSource },
  browserFileRegistry: BrowserFileRegistry<File> | null,
): Promise<PickedFileBytes> {
  if (browserFileRegistry === null) return { error: browserFileUnreachable };
  const held = browserFileRegistry.find(file.name, file.source);
  if (held === null) return { error: browserFileGone };
  return held.arrayBuffer().then(
    (buffer) => ({ bytes: new Uint8Array(buffer) }),
    (error: unknown) => ({ error: unreadable(error) }),
  );
}

function unreadable(error: unknown): BackendError {
  const message = error instanceof Error ? error.message : String(error);
  return { status: 400, code: "browserFileUnreadable", message };
}
