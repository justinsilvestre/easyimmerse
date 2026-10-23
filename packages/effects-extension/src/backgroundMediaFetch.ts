import { base64ToBytes } from "@easyimmerse/backend";
import { createBackgroundRequest } from "./backgroundRequest.ts";
import type {
  DictionaryMedia,
  FetchDictionaryMediaMessage,
} from "./fetchDictionaryMediaMessage.ts";

/** Builds a fetch of a dictionary's file that a content script sends to the background script, which resolves with the file, or null when it could not be fetched. */
export function createBackgroundMediaFetch(
  sendMessage: (message: FetchDictionaryMediaMessage) => Promise<unknown>,
) {
  const request = createBackgroundRequest<
    FetchDictionaryMediaMessage,
    DictionaryMedia
  >(sendMessage);
  return async (dictionaryId: string, path: string): Promise<Blob | null> => {
    const answer = await request({
      kind: "fetchDictionaryMedia",
      dictionaryId,
      path,
    });
    if (!("data" in answer)) return null;
    const { base64, contentType } = answer.data;
    return new Blob([base64ToBytes(base64) as BlobPart], { type: contentType });
  };
}
