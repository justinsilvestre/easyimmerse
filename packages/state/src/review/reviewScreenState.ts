import type {
  ReviewCardState,
  ReviewHoldKind,
  ReviewIntervals,
  ReviewQueueCard,
} from "@easyimmerse/types";

/**
 * A card of the session: the id of its flashcard, with the schedule and the intervals the server gave it.
 * The flashcard's content is read from the project's cached flashcards, so that an edit shows at once.
 */
export type SessionCard = {
  flashcardId: string;
  /** Null for a new card. */
  state: ReviewCardState | null;
  intervals: ReviewIntervals;
};

/** Keeps of a card the server gave what only the session holds. */
export function sessionCardOf({
  flashcard,
  state,
  intervals,
}: ReviewQueueCard): SessionCard {
  return { flashcardId: flashcard.id, state, intervals };
}

/**
 * A step the user took in the session, kept so that Undo can take it back and show the card again as it was:
 * a rating, or burying or suspending the card shown.
 */
export type SessionStep =
  | {
      kind: "answer";
      /** The card as it was shown when rated. */
      card: SessionCard;
      /** The id of the answer's log entry, which names it to the server; null until the answer has landed. */
      answerId: string | null;
    }
  | {
      kind: "hold";
      /** The card as it was shown when set aside. */
      card: SessionCard;
      hold: ReviewHoldKind;
      hasLanded: boolean;
    };

/**
 * The review screen's state: the session's cards, the card shown, and the ratings given.
 * The counts of cards left by kind are read from the cards themselves.
 */
export type ReviewScreenState = {
  kind: "review";
  /** The cards of the queue the server gave that are still to be shown, in its order. */
  queue: readonly SessionCard[];
  /** The cards a rating left due again within the session, as the answer returned them, the earliest due first. */
  comingBack: readonly SessionCard[];
  /** The card shown, taken from the queue or from the cards coming back; null while the queue loads or the session is over. */
  shown: SessionCard | null;
  stage: "front" | "back";
  /** When the shown card appeared, as the user's last action dates it; null when it appeared without one, as when the queue first arrives. */
  shownAtMs: number | null;
  /** The steps taken in the session, oldest first. */
  steps: readonly SessionStep[];
  /** How the latest request for the queue went. The queue is fetched as the screen opens, and again when it runs out. */
  queueStatus: "loading" | "loaded" | "failed";
  /** The step whose undo is on its way, or null. */
  undoing: SessionStep | null;
  /** Whether the deletion of the shown card waits for the user's confirmation. */
  isConfirmingDelete: boolean;
  /** Whether the shown card's screenshot is shown at full size over the screen. */
  isScreenshotExpanded: boolean;
  /**
   * When the cached flashcards list was fetched as the queue last arrived, or 0 when it had not loaded.
   * A flashcard missing from a list fetched later was deleted elsewhere, rather than made after the list.
   */
  listFetchedAtQueueMs: number;
  /** How many times the user asked to hear the shown cards' audio again, which plays it from its start each time. */
  replayCount: number;
};

/** The state the review screen opens with, while its queue loads. */
export const initialReviewScreen: ReviewScreenState = {
  kind: "review",
  queue: [],
  comingBack: [],
  shown: null,
  stage: "front",
  shownAtMs: null,
  steps: [],
  queueStatus: "loading",
  undoing: null,
  isConfirmingDelete: false,
  isScreenshotExpanded: false,
  listFetchedAtQueueMs: 0,
  replayCount: 0,
};
