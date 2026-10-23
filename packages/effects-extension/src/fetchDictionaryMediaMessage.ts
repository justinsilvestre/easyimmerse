/** The message a content script sends the background script to fetch a file stored with a dictionary, such as an image. */
export type FetchDictionaryMediaMessage = {
  kind: "fetchDictionaryMedia";
  dictionaryId: string;
  path: string;
};

/** A file stored with a dictionary, in base64, since a message between extension scripts carries only what JSON can. */
export type DictionaryMedia = { base64: string; contentType: string };

export function isFetchDictionaryMediaMessage(
  value: unknown,
): value is FetchDictionaryMediaMessage {
  if (typeof value !== "object" || value === null) return false;
  const { kind, dictionaryId, path } =
    value as Partial<FetchDictionaryMediaMessage>;
  return (
    kind === "fetchDictionaryMedia" &&
    typeof dictionaryId === "string" &&
    typeof path === "string"
  );
}
