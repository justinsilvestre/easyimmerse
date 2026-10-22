import {
  type BrowserFileRegistry,
  isAudioFileName,
  isDocumentFileName,
} from "@easyimmerse/state";
import type { Flashcard, MediaFile } from "@easyimmerse/types";
import type { MediaItem } from "./MediaList.tsx";
import { mediaCopyOf } from "./mediaCopyOf.ts";
import { mediaIssueOf, type PathAvailabilities } from "./mediaIssueOf.ts";

/**
 * Describes each media file as the project screen lists it, with the number of flashcards made from it, the reason it cannot be opened, if any,
 * and where its bytes are kept.
 */
export function mediaItemsOf(
  mediaFiles: readonly MediaFile[],
  flashcards: readonly Flashcard[],
  registry: BrowserFileRegistry<File> | null,
  pathAvailabilities: PathAvailabilities,
): MediaItem[] {
  return mediaFiles.map((mediaFile) => {
    const issue = mediaIssueOf(mediaFile, registry, pathAvailabilities);
    return {
      id: mediaFile.id,
      name: mediaFile.name,
      kind: kindOf(mediaFile.name),
      flashcardCount: flashcards.filter(
        (flashcard) => flashcard.media_file_id === mediaFile.id,
      ).length,
      ...(issue && { issue }),
      copy: mediaCopyOf(mediaFile, registry, pathAvailabilities),
    };
  });
}

function kindOf(name: string): MediaItem["kind"] {
  if (isDocumentFileName(name)) return "ebook";
  return isAudioFileName(name) ? "audio" : "video";
}
