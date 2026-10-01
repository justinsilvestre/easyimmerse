import type { Effects } from "@easyimmerse/state";
import type { MediaFile } from "@easyimmerse/types";
import type { BrowserFileStore } from "./browserFileStore.ts";

/**
 * Builds the effect that has the player load media stored in the browser directly from an object URL.
 * Rejects for media the browser does not hold.
 * Only one media file is open at a time, so each URL is revoked when the next one is made.
 */
export function createResolveMediaPlayback(
  store: BrowserFileStore,
): Effects["resolveMediaPlayback"] {
  let currentUrl: string | null = null;
  return async (_projectId, media) => {
    const blob = await findStoredMedia(store, media);
    if (blob === null)
      throw new Error(`${media.name} is not stored in this browser.`);
    if (currentUrl !== null) URL.revokeObjectURL(currentUrl);
    currentUrl = URL.createObjectURL(blob);
    return { kind: "direct", url: currentUrl };
  };
}

async function findStoredMedia(
  store: BrowserFileStore,
  media: MediaFile,
): Promise<Blob | null> {
  return media.source.kind === "browser_file"
    ? store.get(media.source.key)
    : null;
}

/** Builds the effect that reads the text of a file stored in the browser. Rejects for an unknown key. */
export function createReadStoredFileText(
  store: BrowserFileStore,
): Effects["readStoredFileText"] {
  return async (key) => (await getStoredBlob(store, key)).text();
}

/** Builds the effect that reads the bytes of a file stored in the browser. Rejects for an unknown key. */
export function createReadStoredFileBytes(
  store: BrowserFileStore,
): Effects["readStoredFileBytes"] {
  return async (key) =>
    new Uint8Array(await (await getStoredBlob(store, key)).arrayBuffer());
}

async function getStoredBlob(
  store: BrowserFileStore,
  key: string,
): Promise<Blob> {
  const blob = await store.get(key);
  if (blob === null)
    throw new Error("The file is no longer stored in this browser.");
  return blob;
}
