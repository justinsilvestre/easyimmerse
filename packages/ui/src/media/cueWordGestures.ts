import type { Cue } from "@easyimmerse/types";
import type { ActiveWord } from "../components/ClickableText.tsx";
import type { WordGestures, WordHit } from "../components/useWordGestures.ts";

type CueWordHandler = (hit: WordHit, cue: Cue) => void;

/**
 * What the user can do to a word of a subtitle cue, each reported with the cue, as `WordGestures` describes.
 * Offsets count in the cue's text without markup.
 */
export type CueWordGestures = {
  onWordClick?: CueWordHandler;
  onWordDoubleClick?: CueWordHandler;
  onWordPointed?: (
    hit: WordHit | null,
    input: WordHit["input"],
    cue: Cue,
  ) => void;
  // A handler with nothing to answer returns nothing, as the other handlers do.
  // biome-ignore lint/suspicious/noConfusingVoidType: see above
  onWordHover?: (hit: WordHit, cue: Cue) => void | Promise<number | null>;
  onWordHoverAnswered?: (
    hit: WordHit,
    matchedLength: number | null,
    cue: Cue,
  ) => void;
  onWordHold?: CueWordHandler;
};

/** Binds the gestures to the cue whose words they come from. */
export function gesturesForCue(
  gestures: CueWordGestures,
  cue: Cue,
): WordGestures {
  const bind = <H, R>(handler: ((hit: H, cue: Cue) => R) | undefined) =>
    handler && ((hit: H) => handler(hit, cue));
  const { onWordPointed, onWordHoverAnswered } = gestures;
  return {
    onWordClick: bind(gestures.onWordClick),
    onWordDoubleClick: bind(gestures.onWordDoubleClick),
    onWordPointed:
      onWordPointed && ((hit, input) => onWordPointed(hit, input, cue)),
    onWordHover: bind(gestures.onWordHover),
    onWordHoverAnswered:
      onWordHoverAnswered &&
      ((hit, matchedLength) => onWordHoverAnswered(hit, matchedLength, cue)),
    onWordHold: bind(gestures.onWordHold),
  };
}

/**
 * The word of a subtitle cue that the dictionary pop-up shows, and the pop-up's id, as `ClickableText` takes it within the cue.
 * It is highlighted only while the subtitles have no lookup cursor.
 */
export type ActiveCueWord = ActiveWord & { cueIndex: number };

/** The active word within one cue's text, if it lies there. */
export function activeWordIn(
  activeWord: ActiveCueWord | undefined,
  cue: Cue,
): ActiveWord | undefined {
  return activeWord?.cueIndex === cue.index ? activeWord : undefined;
}
