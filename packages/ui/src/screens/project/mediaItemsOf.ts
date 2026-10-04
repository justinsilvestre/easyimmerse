import type { Flashcard, MediaFile } from "@easyimmerse/types";
import { isAudioFileName } from "../../player/isAudioFileName.ts";
import type { MediaItem } from "../../projects/MediaList.tsx";

/** Describes each media file for the project's media list, with the number of flashcards made from it. */
export function mediaItemsOf(
  mediaFiles: readonly MediaFile[],
  flashcards: readonly Flashcard[],
): MediaItem[] {
  return mediaFiles.map((mediaFile) => ({
    id: mediaFile.id,
    name: mediaFile.name,
    kind: isAudioFileName(mediaFile.name) ? "audio" : "video",
    flashcardCount: flashcards.filter(
      (flashcard) => flashcard.media_file_id === mediaFile.id,
    ).length,
  }));
}
