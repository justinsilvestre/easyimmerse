import type { ReviewQueueCard } from "@easyimmerse/types";

/** A rating given in the session, kept so that Undo can take it back and show the card again as it was. */
export type SessionAnswer = {
  /** The card as it was shown when rated. */
  card: ReviewQueueCard;
  /** The time of the answer's log entry, which names it to the server; null until the answer has landed. */
  answeredAtMs: number | null;
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
  answers: readonly SessionAnswer[];
  /** How the latest request for the queue went. The queue is fetched as the screen opens, and again when it runs out. */
  queueStatus: "loading" | "loaded" | "failed";
  /** The time of the answer whose undo is on its way, or null. */
  undoingAtMs: number | null;
  /** Whether the deletion of the shown card waits for the user's confirmation. */
  isConfirmingDelete: boolean;
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
  answers: [],
  queueStatus: "loading",
  undoingAtMs: null,
  isConfirmingDelete: false,
  replayCount: 0,
};
