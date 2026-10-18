import type { ReaderLocation } from "@easyimmerse/state";
import type { TextSpan } from "@easyimmerse/types";
import type { ReactNode } from "react";

/** What the reader view shows and does for the audio a book is aligned with. */
export type ReaderAudio = {
  /** The compact player, shown above the progress slider while the toolbar shows. */
  bar: ReactNode;
  /** The dialogs the audio file may call for before it plays, such as the conversion notice, shown over the reader. */
  dialogs?: ReactNode;
  /** The text being spoken now, which is highlighted, or null between segments and before playback starts. */
  spokenSpan: TextSpan | null;
  /** Whether the audio is playing, while which the text follows the spoken segment. */
  isPlaying: boolean;
  /** Plays the segment that holds the place in the book, for a Ctrl-click or Cmd-click on a word, or the key for the current sentence. */
  playAt: (location: ReaderLocation) => void;
};
