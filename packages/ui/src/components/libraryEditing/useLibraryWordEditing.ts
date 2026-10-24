import {
  useApplyLibraryEntryMutation,
  usePutLibraryWordsMutation,
} from "@easyimmerse/backend";
import {
  actions,
  type ChosenWord,
  type LookupFieldsContext,
  libraryLookupResponse,
  selectLibraryWordPlace,
  transientNotice,
} from "@easyimmerse/state";
import type {
  LibrarySegment,
  LibraryWord,
  LookupResult,
} from "@easyimmerse/types";
import { libraryFailureMessage } from "../../lib/library/libraryFailureMessage.ts";
import { useAppDispatch } from "../../useAppDispatch.ts";
import { useAppSelector } from "../../useAppSelector.ts";
import type { LibraryWords } from "../wordLookup/libraryWords.ts";
import { libraryEntryOf } from "./libraryEntryOf.ts";
import {
  librarySpanOf,
  libraryWordPlaceOf,
  libraryWordPlaceShown,
  storedWordAtPlace,
  withLibraryWord,
  withoutLibraryWord,
} from "./libraryWordEdits.ts";

/**
 * The library manager's changes to the words of an item they prepare, made from the dictionary pop-up on the text
 * they clicked or selected in the player or the reader: giving it one of their dictionaries' entries, in place of any word it overlaps,
 * removing the stored word there, or giving that word's entry to every word written the same.
 * Each change is saved at once, and a notice tells when it could not be.
 * Returns null unless the manager is preparing the item; `forLearners` is null while the pop-up shows no text of the item.
 */
export function useLibraryWordEditing(
  library: LibraryWords | undefined,
  shown: ChosenWord | null,
  context: LookupFieldsContext,
) {
  const dispatch = useAppDispatch();
  const selected = useAppSelector(selectLibraryWordPlace);
  const [putWords] = usePutLibraryWordsMutation();
  const [applyEntry] = useApplyLibraryEntryMutation();
  if (!library?.isEditing) return null;
  const { item, text } = library;
  const place = libraryWordPlaceShown(text, shown, selected);
  const segment = text.segments.find(
    ({ index }) => index === place?.segmentIndex,
  );
  const report = (error: unknown) =>
    dispatch(
      actions.noticeRequested(
        transientNotice(
          "danger",
          libraryFailureMessage(error, "Could not save the word."),
        ),
      ),
    );
  const save = (words: LibraryWord[]) =>
    segment &&
    putWords({ itemId: item.id, segmentIndex: segment.index, words })
      .unwrap()
      .catch(report);
  const stored = place && segment ? storedWordAtPlace(segment, place) : null;
  const storedText = segment?.text.slice(stored?.start, stored?.end) ?? "";
  return {
    /** Remembers the text chosen in a segment, as far as `selectedEnd` when it was selected rather than clicked. */
    choose: (chosen: ChosenWord, selectedEnd?: number) =>
      dispatch(
        actions.libraryWordSelected(
          libraryWordPlaceOf(text, chosen, selectedEnd),
        ),
      ),
    /** What the pop-up's section for learners shows and does, or null while it shows no text of the item. */
    forLearners: segment
      ? {
          stored: stored && {
            text: storedText,
            result: storedResultOf(stored, segment, item.title),
          },
          onRemove: () => {
            if (stored) save(withoutLibraryWord(segment.words, stored.start));
          },
          onApplyEverywhere: () => {
            if (!stored) return;
            const apply = { word_text: storedText, entry: stored.entry };
            applyEntry({ itemId: item.id, apply }).unwrap().catch(report);
          },
        }
      : null,
    /** Gives the chosen text the entry of the result at `entryIndex`, or of every result. */
    saveEntry: (
      results: readonly LookupResult[],
      entryIndex: number | null,
    ) => {
      const entry = libraryEntryOf(results, entryIndex, context);
      if (!place || !segment || entry === null) return;
      const matched = results[entryIndex ?? 0]?.matchedText ?? null;
      const span = librarySpanOf(segment.text, place, matched);
      save(withLibraryWord(segment.words, span, entry));
    },
  };
}

/** The stored word's entry as the pop-up shows it to learners. */
function storedResultOf(
  word: LibraryWord,
  segment: LibrarySegment,
  itemTitle: string,
): LookupResult {
  const [result] = libraryLookupResponse(word, segment.text, itemTitle).results;
  if (result === undefined) throw new Error("A library word has one result.");
  return result;
}
