import type { LookupSource } from "@easyimmerse/state";
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
  onWordHover?: CueWordHandler;
  lookUpMatchedLength?: (
    hit: WordHit,
    cue: Cue,
  ) => Promise<number | null> | null;
  onWordHold?: CueWordHandler;
};

/** Binds the gestures to the cue whose words they come from. */
export function gesturesForCue(
  gestures: CueWordGestures,
  cue: Cue,
): WordGestures {
  const bind = <H, R>(handler: ((hit: H, cue: Cue) => R) | undefined) =>
    handler && ((hit: H) => handler(hit, cue));
  const { onWordPointed } = gestures;
  return {
    onWordClick: bind(gestures.onWordClick),
    onWordDoubleClick: bind(gestures.onWordDoubleClick),
    onWordPointed:
      onWordPointed && ((hit, input) => onWordPointed(hit, input, cue)),
    onWordHover: bind(gestures.onWordHover),
    lookUpMatchedLength: bind(gestures.lookUpMatchedLength),
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

/** The occurrence the pop-up shows, with the pop-up's id and the length its lookup matched, as `useWordLookup` gives it. */
type ShownOccurrence = {
  source: LookupSource | null;
  start: number;
  length: number | null | undefined;
  popupId: string;
};

/**
 * The word of a cue the pop-up shows, highlighted only while the subtitles have no lookup cursor,
 * so that only one word is ever highlighted; undefined while the pop-up shows no word of a cue.
 */
export function activeCueWordOf(
  occurrence: ShownOccurrence | null | undefined,
  hasCursor: boolean,
): ActiveCueWord | undefined {
  if (occurrence?.source?.kind !== "cue") return undefined;
  const { start, length, popupId } = occurrence;
  const cueIndex = occurrence.source.cue.index;
  return { cueIndex, start, length, popupId, isHighlighted: !hasCursor };
}
