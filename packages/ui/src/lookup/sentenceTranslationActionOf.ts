import {
  actions,
  isSameOccurrence,
  type LookupSource,
  type LookupState,
} from "@easyimmerse/state";

/**
 * What the T key does to the sentence row's translation, or null when there is none to show:
 * while the pop-up shows the word at the lookup cursor, or there is no cursor, it shows or hides the row's translation;
 * else it opens the pop-up at the cursor's word with the translation shown, or, with no cursor and no pop-up,
 * on its search field with the current sentence's or cue's translation shown.
 * `hasTranslationOf` tells whether a passage, or the current sentence or cue for null, has a translation that is not already on screen.
 */
export function sentenceTranslationActionOf(
  lookup: LookupState,
  hasTranslationOf: (source: LookupSource | null) => boolean,
) {
  const cursorWord = lookup.cursor?.chosen ?? null;
  const shown = lookup.popup?.chosen ?? null;
  const isOnShownWord =
    cursorWord === null ||
    isSameOccurrence(shown?.occurrence, cursorWord.occurrence);
  if (lookup.popup !== null && isOnShownWord)
    return hasTranslationOf(shown?.source ?? null)
      ? actions.lookupSentenceTranslationToggled()
      : null;
  if (cursorWord !== null)
    return hasTranslationOf(cursorWord.source)
      ? actions.lookupWordHeld(cursorWord, true)
      : null;
  return hasTranslationOf(null)
    ? actions.lookupSentenceTranslationOpened()
    : null;
}
