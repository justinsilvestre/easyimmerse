import type { Cue, Flashcard, FlashcardContent } from "@easyimmerse/types";
import { stripMarkup } from "../components/ClickableText.tsx";
import type { Range } from "../components/RunText.tsx";

type CardFromCue = Pick<Flashcard, "cue_index" | "word_start"> & {
  content: Pick<FlashcardContent, "word">;
};

/**
 * Where each cue's text holds the words that flashcards were made from, by cue index,
 * with offsets in the text without markup. A card's word counts where the card was made from it,
 * or at its first occurrence in its cue when the card does not say where or its word is no longer there;
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
  for (const { cue_index: cueIndex, word_start, content } of flashcards) {
    if (cueIndex === null) continue;
    const text = textsByIndex.get(cueIndex) ?? "";
    const range = wordRangeIn(text, content.word, word_start);
    if (range) ranges.set(cueIndex, [...(ranges.get(cueIndex) ?? []), range]);
  }
  return ranges;
}

function wordRangeIn(
  text: string,
  word: string,
  start: number | null,
): Range | null {
  if (word === "") return null;
  const from =
    start !== null && text.startsWith(word, start) ? start : text.indexOf(word);
  return from === -1 ? null : { from, to: from + word.length };
}
