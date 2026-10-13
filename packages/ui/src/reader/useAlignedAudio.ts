import {
  useListAlignmentsQuery,
  useListMediaFilesQuery,
} from "@easyimmerse/backend";
import { actions } from "@easyimmerse/state";
import type { Alignment, MediaFile, TimedSpan } from "@easyimmerse/types";
import { useEffect, useMemo } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { latestAlignments } from "./alignment/latestAlignments.ts";

/** The audio a book is aligned with: the audio file, and when each stretch of the text is heard in it. */
export type AlignedAudio = { file: MediaFile; segments: readonly TimedSpan[] };

/**
 * The audio the open book is aligned with, by its newest audio alignment, or null while the alignments load
 * or when the book has none. Once it is known, the store's player plays the audio file, as `readerAudioOpened` asks.
 */
export function useAlignedAudio(
  projectId: string,
  bookId: string,
): AlignedAudio | null {
  const dispatch = useAppDispatch();
  const mediaFiles = useListMediaFilesQuery(projectId).data?.media_files;
  const alignments = useListAlignmentsQuery({
    projectId,
    mediaFileId: bookId,
  }).data?.alignments;
  const aligned = useMemo(
    () => alignedAudioOf(alignments, mediaFiles),
    [alignments, mediaFiles],
  );
  const file = aligned?.file ?? null;
  useEffect(() => {
    if (file !== null) dispatch(actions.readerAudioOpened(file));
  }, [dispatch, file]);
  return aligned;
}

/**
 * The audio of the newest audio alignment, when its audio file is one of the project's media files.
 * An alignment whose audio file is gone counts as none.
 */
export function alignedAudioOf(
  alignments: readonly Alignment[] | undefined,
  mediaFiles: readonly MediaFile[] | undefined,
): AlignedAudio | null {
  const audio = alignments ? latestAlignments(alignments).audio : null;
  const file = audio
    ? mediaFiles?.find(({ id }) => id === audio.audio_media_file_id)
    : undefined;
  return audio && file ? { file, segments: audio.segments } : null;
}
