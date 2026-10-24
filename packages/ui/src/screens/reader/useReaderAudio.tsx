import { actions, selectPlayer, selectSpokenSpan } from "@easyimmerse/state";
import type { Document } from "@easyimmerse/types";
import { PlaybackDialogs } from "../../components/player/PlaybackDialogs.tsx";
import { useAppDispatch } from "../../useAppDispatch.ts";
import { useAppSelector } from "../../useAppSelector.ts";
import { segmentAt } from "./alignment/audioAlignment.ts";
import { ReaderAudioPlayer } from "./ReaderAudioPlayer.tsx";
import type { ReaderAudio } from "./readerAudio.ts";
import { useAlignedAudio } from "./useAlignedAudio.ts";

/**
 * The audio the open book is aligned with, for the reader view, or undefined when it has none.
 * The bar holds the player, which `ReaderAudioPlayer` explains; the dialogs are the track choice or conversion notice
 * its audio file may call for. Playing at a place in the book seeks to the start of its segment and plays.
 */
export function useReaderAudio(
  projectId: string,
  bookId: string,
  /** The book's text as the reader shows it, in which the words played lie. */
  text: Document,
): ReaderAudio | undefined {
  const dispatch = useAppDispatch();
  const aligned = useAlignedAudio(projectId, bookId);
  const spokenSpan = useAppSelector(selectSpokenSpan);
  const isPlaying = useAppSelector((state) => selectPlayer(state).isPlaying);
  if (aligned === null) return undefined;
  return {
    bar: <ReaderAudioPlayer projectId={projectId} audioFile={aligned.file} />,
    dialogs: (
      <PlaybackDialogs projectId={projectId} mediaFileId={aligned.file.id} />
    ),
    spokenSpan,
    isPlaying,
    playAt: (location) => {
      const segment = segmentAt(aligned.segments, text, location);
      if (segment === null) return;
      dispatch(actions.seekRequested(segment.start_ms / 1000));
      dispatch(actions.playRequested());
    },
    hasSegmentAt: (location) =>
      segmentAt(aligned.segments, text, location) !== null,
  };
}
