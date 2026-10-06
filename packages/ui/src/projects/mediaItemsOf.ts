import { isDocumentFileName } from "@easyimmerse/state";
import type { Flashcard, MediaFile } from "@easyimmerse/types";
import { isAudioFileName } from "../player/isAudioFileName.ts";
import type { MediaItem } from "./MediaList.tsx";

/** Describes each media file as the project screen lists it, with the number of flashcards made from it. */
export function mediaItemsOf(
  mediaFiles: readonly MediaFile[],
  flashcards: readonly Flashcard[],
): MediaItem[] {
  return mediaFiles.map((mediaFile) => ({
    id: mediaFile.id,
    name: mediaFile.name,
    kind: kindOf(mediaFile.name),
    flashcardCount: flashcards.filter(
      (flashcard) => flashcard.media_file_id === mediaFile.id,
    ).length,
  }));
}

function kindOf(name: string): MediaItem["kind"] {
  if (isDocumentFileName(name)) return "ebook";
  return isAudioFileName(name) ? "audio" : "video";
}
