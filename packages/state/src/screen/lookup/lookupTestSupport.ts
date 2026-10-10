import type { Cue, LookupResponse, LookupResult } from "@easyimmerse/types";
import type { AppAction } from "../../app/appAction.ts";
import { actions } from "../../app/appAction.ts";
import {
  exampleContext,
  exampleNewFlashcard,
} from "../../flashcards/exampleFlashcards.ts";
import type { FlashcardDestination } from "../../flashcards/flashcardActions.ts";
import { applyToMediaScreen } from "../mediaScreen/mediaScreenTestSupport.ts";
import { lookupRequestId } from "./lookupIds.ts";
import type { ChosenWord } from "./lookupState.ts";

const firstCue: Cue = {
  index: 1,
  start_ms: 0,
  end_ms: 2000,
  text: "The cat is sleeping.",
};

/** A cue after the first, with another passage. */
export const secondCue: Cue = {
  index: 2,
  start_ms: 2000,
  end_ms: 4000,
  text: "The dog is eating.",
};

/** A word of a cue, the first unless another is given, chosen at its offset there. */
export function chosenWord(
  term: string,
  start: number,
  cue: Cue = firstCue,
): ChosenWord {
  return {
    word: {
      term,
      query: {
        text: cue.text.slice(start),
        language: "de",
        context: cue.text,
        offset: start,
      },
    },
    source: { kind: "cue", cue },
    occurrence: { passage: String(cue.index), start },
    anchor: { elementId: `word-${cue.index}-${start}` },
  };
}

export const cat = chosenWord("cat", 4);
export const dog = chosenWord("dog", 0);

/** A flashcard asked for from a word, under an id named after the word, saved at once unless it goes to the form. */
export const requestFlashcard = (
  chosen: ChosenWord,
  destination: FlashcardDestination = "save",
) =>
  actions.lookupFlashcardRequested(
    chosen,
    destination,
    exampleNewFlashcard(`f-${chosen.word.term}`, chosen.word.term),
    exampleContext,
  );

/**
 * The C key as the UI makes its flashcards: one for the cursor's word `atCursor`, under the id f-cursor,
 * and one for no word, under the id f-wordless. Pass null for `atCursor` when there is no cursor.
 */
export const requestCursorFlashcard = (
  atCursor: ChosenWord | null,
  destination: FlashcardDestination = "save",
) =>
  actions.lookupCursorFlashcardRequested(
    destination,
    atCursor && exampleNewFlashcard("f-cursor", atCursor.word.term),
    exampleNewFlashcard("f-wordless", ""),
    exampleContext,
  );

/** A word held inside the pop-up, which becomes a flashcard saved at once. */
export const holdInPopup = (term: string) =>
  actions.lookupPopupWordHeld(
    term,
    "save",
    exampleNewFlashcard(`f-${term}`, term),
    exampleContext,
  );

/** The fields of the lookup of the flashcard with this id, written once the lookup settled; null when it found nothing. */
export const fieldsWritten = (flashcardId: string) =>
  actions.flashcardFieldsWritten(lookupRequestId(flashcardId), null);

/** The settle of the lookup of the flashcard with this id, for the word given. */
export const lookupSettled = (
  flashcardId: string,
  chosen: ChosenWord,
  outcome:
    | { ok: true; data: LookupResponse }
    | { ok: false; error: { status: 500; message: string } } = {
    ok: true,
    data: { results: [], kanji: [], stylesheets: [] },
  },
) =>
  actions.requestSettled(
    lookupRequestId(flashcardId),
    {
      kind: "lookupText",
      query: chosen.word.query ?? { text: "", language: "de" },
    },
    outcome,
  );

/** The mouse pointing at a word and resting there for the hover delay. */
export const restingOn = (chosen: ChosenWord) =>
  [
    actions.lookupCursorMoved(chosen, "mouse"),
    actions.lookupWordHovered(chosen),
  ] as const;

/** The settle of the hover lookup numbered `sequence` among those in flight, for the word given: matching `matchedText`, or failed when it is null. */
export const hoverSettled = (
  sequence: number,
  chosen: ChosenWord,
  matchedText: string | null,
) =>
  actions.requestSettled(
    `lookup/hover/${sequence}`,
    {
      kind: "lookupText",
      query: chosen.word.query ?? { text: "", language: "de" },
    },
    matchedText === null
      ? { ok: false, error: { status: 500, message: "failed" } }
      : {
          ok: true,
          data: {
            results: [resultMatching(matchedText)],
            kanji: [],
            stylesheets: [],
          },
        },
  );

function resultMatching(matchedText: string): LookupResult {
  return {
    matchedText,
    term: matchedText,
    reading: null,
    inflectionChains: [],
    definitions: [],
    frequencies: [],
    pronunciations: [],
  };
}

/** Applies an action to m1's media screen after the given earlier actions, and returns its lookup with the effects. */
export function applyToLookup(action: AppAction, ...before: AppAction[]) {
  const [screen, effects] = applyToMediaScreen(action, ...before);
  return [screen.lookup, effects] as const;
}
