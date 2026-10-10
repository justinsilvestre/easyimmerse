import type { Cue, LookupResponse, LookupResult } from "@easyimmerse/types";
import type { AppAction } from "../../app/appAction.ts";
import { actions } from "../../app/appAction.ts";
import { stateAfter } from "../../app/stateAfter.ts";
import type { MediaScreenState } from "../screenState.ts";
import { lookupHoverRequestId, lookupRequestId } from "./lookupIds.ts";
import type { ChosenWord } from "./lookupState.ts";
import { updateLookup } from "./updateLookup.ts";

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

/** The settle of the lookup of the flashcard with this sequence, for the word given. */
export const lookupSettled = (
  sequence: number,
  chosen: ChosenWord,
  outcome:
    | { ok: true; data: LookupResponse }
    | { ok: false; error: { status: 500; message: string } } = {
    ok: true,
    data: { results: [], kanji: [], stylesheets: [] },
  },
) =>
  actions.requestSettled(
    lookupRequestId(sequence),
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

/** The settle of the hover lookup with this sequence for the word given: matching `matchedText`, or failed when it is null. */
export const hoverSettled = (
  sequence: number,
  chosen: ChosenWord,
  matchedText: string | null,
) =>
  actions.requestSettled(
    lookupHoverRequestId(sequence),
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

/** Applies an action to the lookup of m1's media screen after the given earlier actions. */
export function applyToLookup(action: AppAction, ...before: AppAction[]) {
  const app = stateAfter(actions.openMediaFileRequested("p1", "m1"), ...before);
  const screen = app.screen.main as MediaScreenState;
  return updateLookup(screen.lookup, action, screen.player, app);
}
