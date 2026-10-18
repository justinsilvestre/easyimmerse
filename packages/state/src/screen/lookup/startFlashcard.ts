import type { NewFlashcard } from "@easyimmerse/types";
import type { AppAction } from "../../app/appAction.ts";
import type { Effect } from "../../app/effect.ts";
import { updated } from "../../app/updated.ts";
import type { FlashcardDestination } from "../../flashcards/flashcardActions.ts";
import type { LookupFieldsContext } from "../../flashcards/flashcardForm.ts";
import type { PlayerState } from "../mediaScreen/playerState.ts";
import { lookupActions } from "./lookupActions.ts";
import { lookupRequestId, lookupTimerIds } from "./lookupIds.ts";
import {
  cancelCloseTimer,
  open,
  setAside,
  show,
  showsOccurrence,
} from "./lookupMoves.ts";
import type {
  ChosenWord,
  LookupState,
  LookupWord,
  PendingFlashcard,
} from "./lookupState.ts";
import { flashcardLookupWaitMs } from "./lookupTiming.ts";

/**
 * The flashcard that a word's action asks for,
 * or null when the action asks for none, as a word held in a pop-up that shows nothing or the C key with no lookup cursor.
 */
export function requestedFlashcard(
  lookup: LookupState,
  action: AppAction,
): PendingFlashcard | null {
  if (action.type === "lookupFlashcardRequested")
    return pendingFor(action.chosen, action);
  if (action.type === "lookupCursorFlashcardRequested") {
    const { atCursor } = action;
    const chosen = lookup.cursor?.chosen;
    return atCursor && chosen
      ? pendingFor(chosen, { ...action, flashcard: atCursor })
      : null;
  }
  if (action.type !== "lookupPopupWordHeld") return null;
  const chosen = popupWordChosen(lookup, action.term);
  return chosen && pendingFor(chosen, action);
}

/**
 * Starts a flashcard from a word, showing the word in the pop-up when it comes from the text,
 * and waits up to `flashcardLookupWaitMs` for the word's lookup, in place of a flashcard still waiting.
 * With nothing to look up, the pop-up is set aside at once, the flashcards take the card straight away, and a flashcard still waiting keeps waiting.
 */
export function startFlashcard(
  lookup: LookupState,
  pending: PendingFlashcard,
  player: PlayerState,
) {
  const { chosen, flashcardId } = pending;
  const { query } = chosen.word;
  const move = query === null ? show : open;
  const [opened, openEffects] =
    chosen.occurrence !== null && !showsOccurrence(lookup, chosen)
      ? move(lookup, chosen, player)
      : updated(lookup, cancelCloseTimer);
  if (query === null) {
    const [aside, asideEffects] = setAside(opened);
    return updated(aside, ...openEffects, ...asideEffects);
  }
  const send = {
    type: "sendRequest",
    id: lookupRequestId(flashcardId),
    request: { kind: "lookupText", query },
  } satisfies Effect;
  const wait = {
    type: "startTimer",
    id: lookupTimerIds.flashcardWait,
    ms: flashcardLookupWaitMs,
    action: lookupActions.lookupFlashcardWaitEnded(flashcardId),
  } satisfies Effect;
  return updated(
    { ...opened, pendingFlashcard: pending },
    ...openEffects,
    send,
    wait,
  );
}

/** What a flashcard from a word is asked for with: where it goes, the flashcard the dispatcher made, and how its definitions are sorted. */
type FlashcardRequest = {
  destination: FlashcardDestination;
  flashcard: NewFlashcard;
  context: LookupFieldsContext;
};

function pendingFor(
  chosen: ChosenWord,
  { destination, flashcard, context }: FlashcardRequest,
): PendingFlashcard {
  return {
    chosen,
    destination,
    draft: flashcard.draft,
    flashcardId: flashcard.id,
    context,
  };
}

/** A word held inside the pop-up, with the passage and place of the word the pop-up shows, or null when it shows none. */
function popupWordChosen(lookup: LookupState, term: string): ChosenWord | null {
  const shown = lookup.popup?.chosen;
  if (!shown) return null;
  return {
    word: wordInPopup(term, shown.word),
    source: shown.source,
    occurrence: null,
    anchor: shown.anchor,
  };
}

/** A word of the pop-up looked up in the language of the word the pop-up shows, or not at all when that one is not. */
function wordInPopup(term: string, shown: LookupWord): LookupWord {
  const query = shown.query && { text: term, language: shown.query.language };
  return { term, query };
}
