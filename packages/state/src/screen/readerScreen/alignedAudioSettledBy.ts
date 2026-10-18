import type { MediaFile } from "@easyimmerse/types";
import type { AppAction } from "../../app/appAction.ts";
import type { ReadableState } from "../../app/feature.ts";
import { cacheEntry } from "../../server/cacheEntry.ts";
import { isSettled } from "../../server/isSettled.ts";
import { selectMediaScreen } from "../mediaScreen/mediaScreenSelectors.ts";
import { playbackRequestIds } from "../mediaScreen/playbackRequests.ts";
import { alignedAudioOf } from "./readerAudioSelectors.ts";

/**
 * Returns the audio file the open book turns out to be aligned with, when the action is the answer to the reader's request
 * for the book's alignments, and null for any other action, or when the book has no audio among the project's cached media files.
 * From that answer on, the screen's player plays the audio file, as `playedMediaFileOf` describes.
 */
export function alignedAudioSettledBy(
  action: AppAction,
  app: Pick<ReadableState, "route" | "screen" | "backend">,
): MediaFile | null {
  const route = selectMediaScreen(app)?.route;
  if (
    route === undefined ||
    !isSettled(
      action,
      playbackRequestIds(route.mediaFileId).alignments,
      "listAlignments",
    ) ||
    !action.outcome.ok
  )
    return null;
  const mediaFiles =
    cacheEntry(app.backend, "listMediaFiles", route.projectId)?.data
      ?.media_files ?? null;
  return (
    alignedAudioOf(action.outcome.data.alignments, mediaFiles)?.file ?? null
  );
}
