import type { Cue } from "@easyimmerse/types";
import type { WordGestures, WordHit } from "../components/useWordGestures.ts";

type CueWordHandler = (hit: WordHit, cue: Cue) => void;

/** What the user can do to a word of a subtitle cue, each reported with the cue. Offsets count in the cue's text without markup. */
export type CueWordGestures = {
  onWordClick?: CueWordHandler;
  onWordDoubleClick?: CueWordHandler;
  onWordHoverIntent?: CueWordHandler;
  onWordHold?: CueWordHandler;
};

/** Binds the gestures to the cue whose words they come from. */
export function gesturesForCue(
  gestures: CueWordGestures,
  cue: Cue,
): WordGestures {
  const bind = (handler: CueWordHandler | undefined) =>
    handler && ((hit: WordHit) => handler(hit, cue));
  return {
    onWordClick: bind(gestures.onWordClick),
    onWordDoubleClick: bind(gestures.onWordDoubleClick),
    onWordHoverIntent: bind(gestures.onWordHoverIntent),
    onWordHold: bind(gestures.onWordHold),
  };
}

/** The word of a subtitle cue that the dictionary pop-up shows, and the pop-up's id. */
export type ActiveCueWord = {
  cueIndex: number;
  start: number;
  popupId: string;
};

/** The active word within one cue's text, if it lies there. */
export function activeWordIn(
  activeWord: ActiveCueWord | undefined,
  cue: Cue,
): { start: number; popupId: string } | undefined {
  return activeWord?.cueIndex === cue.index ? activeWord : undefined;
}
