import type { Effects } from "@easyimmerse/state";
import type { MediaFile } from "@easyimmerse/types";
import type { BrowserFileStore } from "./browserFileStore.ts";

/**
 * Builds the effect that gives the player an object URL for media stored in the browser.
 * Rejects for media the browser does not hold.
 * Only one media file is open at a time, so each URL is revoked when the next one is made.
 */
export function createResolveMediaUrl(
  store: BrowserFileStore,
): Effects["resolveMediaUrl"] {
  let currentUrl: string | null = null;
  return async (_projectId, media) => {
    const blob = await findStoredMedia(store, media);
    if (blob === null)
      throw new Error(`${media.name} is not stored in this browser.`);
    if (currentUrl !== null) URL.revokeObjectURL(currentUrl);
    currentUrl = URL.createObjectURL(blob);
    return currentUrl;
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
  return async (key) => {
    const blob = await store.get(key);
    if (blob === null)
      throw new Error("The file is no longer stored in this browser.");
    return blob.text();
  };
}
