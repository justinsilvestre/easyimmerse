import { actions, selectPlayer } from "@easyimmerse/state";
import type { Document } from "@easyimmerse/types";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { PlaybackDialogs } from "../player/PlaybackDialogs.tsx";
import { segmentAt } from "./alignment/audioAlignment.ts";
import { ReaderAudioPlayer } from "./ReaderAudioPlayer.tsx";
import type { ReaderAudio } from "./readerAudio.ts";
import { selectSpokenSpan } from "./selectSpokenSpan.ts";
import { useAlignedAudio } from "./useAlignedAudio.ts";

/**
 * The audio the open book is aligned with, for the reader view, or undefined when it has none.
 * The bar holds the player, which `ReaderAudioPlayer` explains; the dialogs are the track choice or conversion notice
 * its audio file may call for. A Ctrl-click or Cmd-click on a word seeks to the start of its segment and plays.
 */
export function useReaderAudio(
  projectId: string,
  bookId: string,
  /** The book's text as the reader shows it, in which the words played lie. */
  text: Document,
): ReaderAudio | undefined {
  const dispatch = useAppDispatch();
  const aligned = useAlignedAudio(projectId, bookId);
  const segments = aligned?.segments;
  const spokenSpan = useAppSelector((state) =>
    selectSpokenSpan(state, segments),
  );
  const isPlaying = useAppSelector((state) => selectPlayer(state).isPlaying);
  if (aligned === null) return undefined;
  return {
    bar: <ReaderAudioPlayer projectId={projectId} audioFile={aligned.file} />,
    dialogs: (
      <PlaybackDialogs projectId={projectId} mediaFileId={aligned.file.id} />
    ),
    spokenSpan,
    isPlaying,
    onPlayWord: (word) => {
      const segment = segmentAt(aligned.segments, text, word.location);
      if (segment === null) return;
      dispatch(actions.seekRequested(segment.start_ms / 1000));
      dispatch(actions.playRequested());
    },
  };
}
