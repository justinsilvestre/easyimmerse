import type { AppAction } from "../../app/appAction.ts";
import type { AppState } from "../../app/appState.ts";
import type { RequestSettled } from "../../server/serverRequest.ts";
import type { PlayerState } from "../mediaScreen/playerState.ts";
import { moveCursor, withCursor } from "./lookupCursor.ts";
import {
  isHoverRequestId,
  lookupHoverRequestId,
  nextLookupSequence,
} from "./lookupIds.ts";
import { type LookupStep, show, showsOccurrence } from "./lookupMoves.ts";
import type { ChosenWord, LookupState, LookupWord } from "./lookupState.ts";

/** The settle of a hover's lookup request. */
export type HoverSettle = Extract<
  RequestSettled,
  { request: { kind: "lookupText" } }
>;

/** Tells whether the action is the settle of a hover's lookup. */
export function isHoverSettle(action: AppAction): action is HoverSettle {
  return (
    action.type === "requestSettled" &&
    isHoverRequestId(action.id) &&
    action.request.kind === "lookupText"
  );
}

/** Looks up a hovered word for the cursor's highlight; with nothing to look up, the answer is known at once: nothing matched. */
export function hoverWord(
  lookup: LookupState,
  chosen: ChosenWord,
  player: PlayerState,
  app: AppState,
): LookupStep {
  const { query } = chosen.word;
  if (query === null) return answer(lookup, chosen, null, player);
  const id = lookupHoverRequestId(nextLookupSequence(app));
  return [
    lookup,
    [{ type: "sendRequest", id, request: { kind: "lookupText", query } }],
  ];
}

/** Takes a hover lookup's answer, when it is for the word the pointer is still on. A failed lookup matched nothing. */
export function answerHover(
  lookup: LookupState,
  { request, outcome }: HoverSettle,
  player: PlayerState,
): LookupStep {
  const pointed = lookup.cursor?.pointed;
  if (!pointed || !isSameQuery(request.query, pointed.word.query))
    return [lookup, []];
  const length = outcome.ok
    ? (outcome.data.results[0]?.matchedText.length ?? null)
    : null;
  return answer(lookup, pointed, length, player);
}

/**
 * Moves the cursor to the word with the length its lookup matched, and an open pop-up with it,
 * unless the pointer is inside the pop-up or a flashcard waits.
 */
function answer(
  lookup: LookupState,
  chosen: ChosenWord,
  matchedLength: number | null,
  player: PlayerState,
): LookupStep {
  if (lookup.cursor === null) return [lookup, []];
  const cursor = moveCursor(lookup.cursor, {
    type: "answered",
    chosen,
    input: lookup.cursor.input,
    matchedLength,
  });
  const answered = withCursor(lookup, cursor);
  return followsPointer(answered, chosen)
    ? show(answered, chosen, player)
    : [answered, []];
}

/** Tells whether an open pop-up moves to a word the pointer rests on: not while the pointer is inside it or a flashcard waits. */
function followsPointer(lookup: LookupState, chosen: ChosenWord): boolean {
  return (
    lookup.popup?.mode === "word" &&
    !lookup.isPointerInside &&
    lookup.pendingFlashcard === null &&
    !showsOccurrence(lookup, chosen)
  );
}

function isSameQuery(
  first: LookupWord["query"],
  second: LookupWord["query"],
): boolean {
  return (
    first !== null &&
    second !== null &&
    first.text === second.text &&
    first.language === second.language &&
    first.context === second.context &&
    first.offset === second.offset
  );
}
