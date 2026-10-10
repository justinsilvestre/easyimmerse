import type { AppState } from "../app/appState.ts";
import type { Effect } from "../app/effect.ts";
import type { MediaRoute } from "../route/route.ts";
import type { FailedSave } from "./failedSave.ts";
import type { FlashcardCard } from "./flashcardCard.ts";
import type { FlashcardForm } from "./flashcardForm.ts";
import {
  createFlashcardOutbox,
  type FlashcardOutbox,
} from "./flashcardRequests.ts";
import type { WaitingCard } from "./flashcardsState.ts";

/** The form after an action, and what left it, which the flashcards feature takes up. */
export type FormStep = {
  form: FlashcardForm | null;
  /** The card the form opened on, whose clip the player goes to, or null when no card opened. */
  opened: FlashcardCard | null;
  /** The requests, notices and timers the form asks for. */
  effects: readonly Effect[];
  /** How many flashcard requests have been asked for since the app started, the form's included. */
  requestCount: number;
  /** Cards that left the form to be listed among the failed saves. */
  listed: readonly FailedSave[];
  /** New cards that left the form to wait for their lookup. */
  waiting: readonly WaitingCard[];
  /** The flashcard id of the failed save the form took, which leaves the list; null when it took none. */
  taken: string | null;
};

/** Collects a form step while the form's rules run. */
export type FormStepBuilder = {
  outbox: FlashcardOutbox;
  open(card: FlashcardCard): void;
  list(failedSave: FailedSave): void;
  wait(card: WaitingCard): void;
  take(flashcardId: string): void;
  finish(form: FlashcardForm | null): FormStep;
};

/** What the form's rules read and write as they run: the state before the action, the screen's route, and the step they build. */
export type FormContext = {
  app: AppState;
  route: MediaRoute;
  step: FormStepBuilder;
};

/** Starts an empty step whose requests follow the `requestCount` asked for before. */
export function createFormStep(requestCount: number): FormStepBuilder {
  const outbox = createFlashcardOutbox(requestCount);
  let opened: FlashcardCard | null = null;
  const listed: FailedSave[] = [];
  const waiting: WaitingCard[] = [];
  let taken: string | null = null;
  return {
    outbox,
    open: (card) => {
      opened = card;
    },
    list: (failedSave) => listed.push(failedSave),
    wait: (card) => waiting.push(card),
    take: (flashcardId) => {
      taken = flashcardId;
    },
    finish: (form) => ({
      form,
      opened,
      effects: outbox.effects(),
      requestCount: outbox.count(),
      listed,
      waiting,
      taken,
    }),
  };
}
