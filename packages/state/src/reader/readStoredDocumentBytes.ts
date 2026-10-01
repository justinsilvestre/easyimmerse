import type { MediaFile } from "@easyimmerse/types";
import type { Effect } from "../effect.ts";

/** Builds an effect reading the bytes of a document that only the browser can read. */
export function readStoredDocumentBytes(media: MediaFile): Effect[] {
  if (media.kind !== "document" || media.source.kind !== "browser_file")
    return [];
  return [
    {
      type: "readStoredFileBytes",
      key: media.source.key,
      target: { kind: "document", mediaId: media.id },
    },
  ];
}
