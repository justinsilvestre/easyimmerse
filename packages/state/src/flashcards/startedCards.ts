import type { AppAction } from "../app/appAction.ts";
import {
  type FinishedLookupFlashcard,
  lookupFlashcardFinishedBy,
} from "../screen/lookup/lookupFlashcardFinishedBy.ts";
import { lookupRequestId } from "../screen/lookup/lookupIds.ts";
import { mediaScreenActionOf } from "../screen/mediaScreen/mediaScreenActionOf.ts";
import {
  selectMediaScreen,
  selectShownMediaFile,
} from "../screen/mediaScreen/mediaScreenSelectors.ts";
import type { FlashcardApp } from "./flashcardApp.ts";
import { newCard, withLookupFields } from "./flashcardCard.ts";
import { askSave } from "./flashcardSaves.ts";
import { flashcardStartedBy } from "./flashcardStartedBy.ts";
import { startLookupWait } from "./lookupWait.ts";
import { holdForLookup } from "./waitingCards.ts";

/** Saves at once a card started to be saved with no lookup to wait for, offering Undo once it lands. */
export function saveStarted(action: AppAction, app: FlashcardApp) {
  const started = flashcardStartedBy(action);
  const projectId = selectMediaScreen(app)?.route.projectId;
  if (started?.destination !== "save" || projectId === undefined) return [];
  return askSave(
    {
      card: newCard(started.flashcard),
      projectId,
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
