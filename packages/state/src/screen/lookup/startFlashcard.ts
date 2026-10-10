import type { NewFlashcard } from "@easyimmerse/types";
import type { AppAction } from "../../app/appAction.ts";
import type { AppState } from "../../app/appState.ts";
import type { Effect } from "../../app/effect.ts";
import type { FlashcardDestination } from "../../flashcards/flashcardActions.ts";
import type { LookupFieldsContext } from "../../flashcards/flashcardForm.ts";
import type { PlayerState } from "../mediaScreen/playerState.ts";
import { lookupActions } from "./lookupActions.ts";
import {
  lookupRequestId,
  lookupTimerIds,
  nextLookupSequence,
} from "./lookupIds.ts";
import {
  cancelCloseTimer,
  type LookupStep,
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
 * The flashcard that a word's action asks for, numbered after the lookups asked for before,
 * or null when the action asks for none, as a word held in a pop-up that shows nothing or the C key with no cursor.
 */
export function requestedFlashcard(
  lookup: LookupState,
  action: AppAction,
  app: AppState,
): PendingFlashcard | null {
  if (action.type === "lookupFlashcardRequested")
    return pendingFor(action.chosen, action, app);
  if (action.type === "lookupCursorFlashcardRequested") {
    const { atCursor } = action;
    return lookup.cursor && atCursor
      ? pendingFor(
          lookup.cursor.chosen,
          { ...action, flashcard: atCursor },
          app,
        )
      : null;
  }
  if (action.type !== "lookupPopupWordHeld") return null;
  const chosen = popupWordChosen(lookup, action.term);
  return chosen && pendingFor(chosen, action, app);
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
): LookupStep {
  const { chosen, sequence } = pending;
  const { query } = chosen.word;
  const move = query === null ? show : open;
  const [opened, openEffects] =
    chosen.occurrence !== null && !showsOccurrence(lookup, chosen)
      ? move(lookup, chosen, player)
      : [lookup, [cancelCloseTimer]];
  if (query === null) {
    const [aside, asideEffects] = setAside(opened);
    return [aside, [...openEffects, ...asideEffects]];
  }
  const send: Effect = {
    type: "sendRequest",
    id: lookupRequestId(sequence),
    request: { kind: "lookupText", query },
  };
  const wait: Effect = {
    type: "startTimer",
    id: lookupTimerIds.flashcardWait,
    ms: flashcardLookupWaitMs,
    action: lookupActions.lookupFlashcardWaitEnded(sequence),
  };
  return [
    { ...opened, pendingFlashcard: pending },
    [...openEffects, send, wait],
  ];
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
  app: AppState,
): PendingFlashcard {
  return {
    sequence: nextLookupSequence(app),
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
