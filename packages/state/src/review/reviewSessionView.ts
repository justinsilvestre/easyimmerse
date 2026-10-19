/** How far a review session has come, and what is left in it by kind of card. */
export type ReviewSessionProgress = {
  finished: number;
  total: number;
  newCount: number;
  /** The cards still being learned, which come back within the session until they graduate. */
  learningCount: number;
  dueCount: number;
};

/** Why a review session has no card to show. */
export type ReviewEnd =
  | {
      kind: "doneForToday";
      reviewedCount: number;
      /** The cards still being learned that fall due later today, and when the first of them does. */
      comesBack: { count: number; atMs: number } | null;
      /** The new cards that "Learn more" would add to today's, beyond the day's allowance. None hides the button. */
      moreNewCount: number;
      /** The reviews due today that the day's limit left for later days. While any are, no new cards are introduced. */
      heldBackCount: number;
      /** The reviews that "Review more" would add to today's, from those held back. None hides the button. */
      moreReviewCount: number;
    }
  | { kind: "nothingDue"; nextDueAtMs: number | null }
  | { kind: "noFlashcards" }
  /** The session's cards could not be loaded. */
  | { kind: "failed" };
