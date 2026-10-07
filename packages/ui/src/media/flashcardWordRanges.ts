import type { Cue, Flashcard, FlashcardContent } from "@easyimmerse/types";
import { stripMarkup } from "../components/ClickableText.tsx";
import type { Range } from "../components/RunText.tsx";

type CardFromCue = Pick<Flashcard, "cue_index"> & {
  content: Pick<FlashcardContent, "word">;
};

/**
 * Where each cue's text holds the words that flashcards were made from, by cue index,
 * with offsets in the text without markup. A card's word counts at its first occurrence in its cue;
 * a card whose cue does not hold its word is left out.
 */
export function flashcardWordRanges(
  flashcards: readonly CardFromCue[],
  cues: readonly Cue[],
): ReadonlyMap<number, readonly Range[]> {
  const textsByIndex = new Map(
    cues.map((cue) => [cue.index, stripMarkup(cue.text)]),
  );
  const ranges = new Map<number, Range[]>();
  for (const { cue_index: cueIndex, content } of flashcards) {
    if (cueIndex === null) continue;
    const range = wordRangeIn(textsByIndex.get(cueIndex), content.word);
    if (range) ranges.set(cueIndex, [...(ranges.get(cueIndex) ?? []), range]);
  }
  return ranges;
}

function wordRangeIn(text: string | undefined, word: string): Range | null {
  const from = word === "" ? -1 : (text?.indexOf(word) ?? -1);
  return from === -1 ? null : { from, to: from + word.length };
}
