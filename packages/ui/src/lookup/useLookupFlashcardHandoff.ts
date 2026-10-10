import { lookUpTextAhead, selectCachedLookup } from "@easyimmerse/backend";
import {
  actions,
  type PendingFlashcard,
  type RootState,
  selectFinishedLookupFlashcard,
} from "@easyimmerse/state";
import type { DictionarySummary, LookupResult } from "@easyimmerse/types";
import { useEffect, useEffectEvent } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { flashcardFieldsFromLookup } from "./flashcardFieldsFromLookup.ts";
import { placeOf, type StartFlashcardFromLookup } from "./lookupPlace.ts";

/** How a flashcard started from a word is started: saved at once, or opened in the editor. */
export type LookupFlashcardStarts = Record<
  PendingFlashcard["destination"],
  StartFlashcardFromLookup
>;

/**
 * Hands a flashcard that the lookup update no longer waits for to the flashcard hooks, filled from its word's lookup when it answered in time,
 * or else with the lookup's later answer as `lateFields`.
 * Transitional: the flashcard hooks live outside the store until C1, whose update takes the flashcard directly, and this hook goes.
 */
export function useLookupFlashcardHandoff(
  starts: LookupFlashcardStarts,
  languages: { target: string; translation: string },
  dictionaries: readonly DictionarySummary[],
) {
  const dispatch = useAppDispatch();
  const finished = useAppSelector(selectFinishedLookupFlashcard);
  const query = finished?.stage === "ready" ? finished.chosen.word.query : null;
  const cached = useAppSelector((state: RootState) =>
    query ? selectCachedLookup(state, query) : undefined,
  );
  const fieldsOf = (results: readonly LookupResult[]) =>
    flashcardFieldsFromLookup(results, null, languages, dictionaries);
  const handOff = useEffectEvent((pending: PendingFlashcard) => {
    dispatch(actions.lookupFlashcardTaken(pending.sequence));
    const { word } = pending.chosen;
    const fields = cached ? fieldsOf(cached.results) : null;
    const lateFields =
      pending.stage === "late" && word.query
        ? lookUpTextAhead(dispatch, word.query).then(
            (response) => fieldsOf(response.results),
            () => null,
          )
        : undefined;
    starts[pending.destination](
      fields?.word ?? word.term,
      placeOf(pending.chosen),
      fields,
      lateFields,
    );
  });
  useEffect(() => {
    if (finished) handOff(finished);
  }, [finished]);
}
