/** Rejects always, since the native app never stores files the way a browser does. */
export async function readStoredFileText(): Promise<string> {
  throw new Error("The native app has no files stored in a browser.");
}

/** Rejects always, since the native app never stores files the way a browser does. */
export async function readStoredFileBytes(): Promise<Uint8Array> {
  throw new Error("The native app has no files stored in a browser.");
}
