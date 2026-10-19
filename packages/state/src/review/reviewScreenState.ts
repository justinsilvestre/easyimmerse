import type { ReviewHoldKind, ReviewQueueCard } from "@easyimmerse/types";

/**
 * A step the user took in the session, kept so that Undo can take it back and show the card again as it was:
 * a rating, or burying or suspending the card shown.
 */
export type SessionStep =
  | {
      kind: "answer";
      /** The card as it was shown when rated. */
      card: ReviewQueueCard;
      /** The time of the answer's log entry, which names it to the server; null until the answer has landed. */
      answeredAtMs: number | null;
    }
  | {
      kind: "hold";
      /** The card as it was shown when set aside. */
      card: ReviewQueueCard;
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
  queue: readonly ReviewQueueCard[];
  /** The cards a rating left due again within the session, as the answer returned them, the earliest due first. */
  comingBack: readonly ReviewQueueCard[];
  /** The card shown, taken from the queue or from the cards coming back; null while the queue loads or the session is over. */
  shown: ReviewQueueCard | null;
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
  replayCount: 0,
};
