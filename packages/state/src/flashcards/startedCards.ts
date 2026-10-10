import type { NewFlashcard } from "@easyimmerse/types";
import type { AppAction } from "../app/appAction.ts";
import {
  type FinishedLookupFlashcard,
  lookupFlashcardFinishedBy,
} from "../screen/lookup/lookupFlashcardFinishedBy.ts";
import { lookupRequestId } from "../screen/lookup/lookupIds.ts";
import type { LookupState } from "../screen/lookup/lookupState.ts";
import { requestedFlashcard } from "../screen/lookup/startFlashcard.ts";
import { mediaScreenActionOf } from "../screen/mediaScreen/mediaScreenActionOf.ts";
import {
  selectMediaScreen,
  selectShownMediaFile,
} from "../screen/mediaScreen/mediaScreenSelectors.ts";
import type { FlashcardDestination } from "./flashcardActions.ts";
import { newCard, withLookupFields } from "./flashcardCard.ts";
import type { FlashcardApp } from "./flashcardForm.ts";
import { askSave } from "./flashcardSaves.ts";
import { holdForLookup, startLookupWait } from "./waitingCards.ts";

/** Saves at once a card started to be saved with no lookup to wait for, offering Undo once it lands. */
export function saveStarted(action: AppAction, app: FlashcardApp) {
  const onScreen = selectMediaScreen(app);
  if (onScreen === null) return [];
  const started = flashcardStartedBy(onScreen.screen.lookup, action);
  if (started?.destination !== "save") return [];
  return askSave(
    {
      card: newCard(started.flashcard),
      projectId: onScreen.route.projectId,
      from: "background",
      offersUndo: true,
      rollbackIfDiscarded: null,
    },
    app,
    "background",
  );
}

/** Takes a flashcard from a word whose lookup no longer holds it, as `takeLookupFlashcard` describes. */
export function takeFinished(action: AppAction, app: FlashcardApp) {
  const onScreen = selectMediaScreen(app);
  if (onScreen === null) return [];
  const seen = mediaScreenActionOf(app, action);
  const finished = lookupFlashcardFinishedBy(onScreen.screen.lookup, seen);
  return finished ? takeLookupFlashcard(finished, app) : [];
}

/**
 * The flashcard that needs no lookup an action starts, with where it goes: one started outright,
 * or the one for no word that the C or E key asks for when it starts none for the lookup cursor's word.
 */
export function flashcardStartedBy(
  lookup: LookupState,
  action: AppAction,
): { flashcard: NewFlashcard; destination: FlashcardDestination } | null {
  if (action.type === "flashcardStarted") return action;
  if (action.type !== "lookupCursorFlashcardRequested") return null;
  return action.wordless === null || requestedFlashcard(lookup, action)
    ? null
    : { flashcard: action.wordless, destination: action.destination };
}

/**
 * Takes a flashcard from a word that no longer waits for its lookup, unless it opens in the form:
 * one to be saved at once is saved, filled from its lookup when that answered in time, or else waits up to ten seconds more;
 * one abandoned by the screen or the pop-up waits likewise, whatever it was for, so that the user's attempt to make it is never lost.
 */
function takeLookupFlashcard(
  { pending, how, fields }: FinishedLookupFlashcard,
  app: FlashcardApp,
) {
  const { projectId } = selectShownMediaFile(app);
  if (pending.destination === "editor" && how !== "abandoned") return [];
  const card = newCard({ id: pending.flashcardId, draft: pending.draft });
  if (how === "ready") {
    const filled = withLookupFields(card, fields);
    const order = { card: filled, projectId, from: "background" } as const;
    return askSave(
      { ...order, offersUndo: true, rollbackIfDiscarded: null },
      app,
      "background",
    );
  }
  const requestId = lookupRequestId(pending.flashcardId);
  const lookup = { requestId, context: pending.context };
  const waiting = { card, lookup, offersUndo: true };
  return [
    startLookupWait(card.flashcardId),
    ...holdForLookup(waiting, app, "background"),
  ];
}
