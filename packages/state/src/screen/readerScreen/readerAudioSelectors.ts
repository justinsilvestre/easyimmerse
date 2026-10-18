import type {
  Alignment,
  MediaFile,
  TextSpan,
  TimedSpan,
} from "@easyimmerse/types";
import { createSelector } from "reselect";
import type { RootState } from "../../app/createAppStore.ts";
import type { MediaRoute } from "../../route/route.ts";
import { cacheEntry, type ServerCacheSlice } from "../../server/cacheEntry.ts";
import { selectMediaScreen } from "../mediaScreen/mediaScreenSelectors.ts";
import { selectPlayer } from "../screenSelectors.ts";
import { latestAlignments } from "./latestAlignments.ts";

/** The audio a book is aligned with: the audio file, and when each stretch of the text is heard in it. */
export type AlignedAudio = { file: MediaFile; segments: readonly TimedSpan[] };

/**
 * The audio of the newest audio alignment, when its audio file is one of the project's media files.
 * An alignment whose audio file is gone counts as none, as do alignments or media files not yet listed.
 */
export function alignedAudioOf(
  alignments: readonly Alignment[] | null,
  mediaFiles: readonly MediaFile[] | null,
): AlignedAudio | null {
  const audio = alignments ? latestAlignments(alignments).audio : null;
  const file = audio
    ? mediaFiles?.find(({ id }) => id === audio.audio_media_file_id)
    : undefined;
  return audio && file ? { file, segments: audio.segments } : null;
}

/** Returns the audio the media file is aligned with, from the server cache's alignments and media files, or null. */
export function cachedAlignedAudio(
  backend: ServerCacheSlice,
  route: MediaRoute,
): AlignedAudio | null {
  return alignedAudioOf(
    cachedAlignments(backend, route),
    cachedMediaFiles(backend, route.projectId),
  );
}

function cachedAlignments(backend: ServerCacheSlice, route: MediaRoute) {
  const { projectId, mediaFileId } = route;
  return (
    cacheEntry(backend, "listAlignments", { projectId, mediaFileId })?.data
      ?.alignments ?? null
  );
}

function cachedMediaFiles(backend: ServerCacheSlice, projectId: string) {
  return (
    cacheEntry(backend, "listMediaFiles", projectId)?.data?.media_files ?? null
  );
}

const selectOpenRoute = (root: RootState) =>
  selectMediaScreen(root.app)?.route ?? null;

/**
 * Selects the audio the open book is aligned with, or null while no media screen is open, the alignments or media files
 * are not cached, or the book has no audio. The result keeps its reference while the cached alignments and media files do.
 */
export const selectReaderAlignedAudio = createSelector(
  [
    (root: RootState) => {
      const route = selectOpenRoute(root);
      return route && cachedAlignments(root.backend, route);
    },
    (root: RootState) => {
      const route = selectOpenRoute(root);
      return route && cachedMediaFiles(root.backend, route.projectId);
    },
  ],
  alignedAudioOf,
);

/**
 * Returns the text the aligned audio speaks at the player's time, or null between segments or where the book has no audio.
 * Until the audio has played or been moved from its start, nothing counts as spoken, so that an untouched book shows no highlight.
 * The span is the segment's own object, so that it keeps its identity while the same segment is heard.
 */
export function selectSpokenSpan(root: RootState): TextSpan | null {
  const segments = selectReaderAlignedAudio(root)?.segments;
  const { isPlaying, currentTimeSeconds } = selectPlayer(root);
  if (segments === undefined || (!isPlaying && currentTimeSeconds === 0))
    return null;
  return segmentSpokenAt(segments, currentTimeSeconds * 1000)?.span ?? null;
}

/**
 * The first segment heard at the time, from its start up to but not including its end,
 * or null when none is. Segments need not be sorted by time.
 */
export function segmentSpokenAt(
  segments: readonly TimedSpan[],
  timeMs: number,
): TimedSpan | null {
  return (
    segments.find(
      (segment) => segment.start_ms <= timeMs && timeMs < segment.end_ms,
    ) ?? null
  );
}
