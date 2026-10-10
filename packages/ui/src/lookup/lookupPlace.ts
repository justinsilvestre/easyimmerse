import type { ChosenWord, LookupSource } from "@easyimmerse/state";
import type { LookupFlashcardFields } from "./flashcardFieldsFromLookup.ts";

/**
 * The passage a word for a flashcard comes from, and, when the word was pointed at in the passage
 * rather than typed or chosen in the pop-up, its offset there in UTF-16 code units.
 */
export type LookupPlace = { source: LookupSource; start: number | null };

/**
 * Starts a flashcard for a word from its place in a passage, with fields filled from its lookup when one answered,
 * or, through `lateFields`, once a lookup that was too slow to wait for answers.
 */
export type StartFlashcardFromLookup = (
  word: string,
  place: LookupPlace | null,
  lookupFields: LookupFlashcardFields | null,
  lateFields?: Promise<LookupFlashcardFields | null>,
) => void;

/** The place a flashcard made from a chosen word takes its sentence from, or null when the word has no passage. */
export function placeOf(chosen: ChosenWord | null): LookupPlace | null {
  if (!chosen?.source) return null;
  return { source: chosen.source, start: chosen.occurrence?.start ?? null };
}
