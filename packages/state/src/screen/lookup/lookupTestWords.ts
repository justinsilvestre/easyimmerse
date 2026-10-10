import type { LookupResponse } from "@easyimmerse/types";
import type { AppAction } from "../../app/appAction.ts";
import { actions } from "../../app/appAction.ts";
import { stateAfter } from "../../app/stateAfter.ts";
import type { MediaScreenState } from "../screenState.ts";
import { lookupRequestId } from "./lookupIds.ts";
import type { ChosenWord } from "./lookupState.ts";
import { updateLookup } from "./updateLookup.ts";

const cue = {
  index: 1,
  start_ms: 0,
  end_ms: 2000,
  text: "The cat is sleeping.",
};

/** A word of the cue above, chosen at its offset there. */
export function chosenWord(term: string, start: number): ChosenWord {
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
    occurrence: { passage: "1", start },
    anchor: { elementId: `word-${start}` },
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

/** Applies an action to the lookup of m1's media screen after the given earlier actions. */
export function applyToLookup(action: AppAction, ...before: AppAction[]) {
  const app = stateAfter(actions.openMediaFileRequested("p1", "m1"), ...before);
  const screen = app.screen.main as MediaScreenState;
  return updateLookup(
    screen.lookup,
    action,
    screen.player,
    app.operations.requests,
  );
}
