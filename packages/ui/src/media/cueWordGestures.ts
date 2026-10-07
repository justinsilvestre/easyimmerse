import type { Cue } from "@easyimmerse/types";
import type { WordGestures, WordHit } from "../components/useWordGestures.ts";

type CueWordHandler = (hit: WordHit, cue: Cue) => void;

/**
 * What the user can do to a word of a subtitle cue, each reported with the cue. Offsets count in the cue's text without markup.
 * Hover intent may answer with the length of the text its lookup matched, as `WordGestures` describes.
 */
export type CueWordGestures = {
  onWordClick?: CueWordHandler;
  onWordDoubleClick?: CueWordHandler;
  // A handler with nothing to answer returns nothing, as the other handlers do.
  // biome-ignore lint/suspicious/noConfusingVoidType: see above
  onWordHoverIntent?: (hit: WordHit, cue: Cue) => void | Promise<number | null>;
  onWordHold?: CueWordHandler;
};

/** Binds the gestures to the cue whose words they come from. */
export function gesturesForCue(
  gestures: CueWordGestures,
  cue: Cue,
): WordGestures {
  const bind = <R>(handler: ((hit: WordHit, cue: Cue) => R) | undefined) =>
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
  /** How much of the cue's text the lookup matched, once it has answered. */
  length?: number;
  popupId: string;
};

/** The active word within one cue's text, if it lies there. */
export function activeWordIn(
  activeWord: ActiveCueWord | undefined,
  cue: Cue,
): { start: number; length?: number; popupId: string } | undefined {
  return activeWord?.cueIndex === cue.index ? activeWord : undefined;
}
