/** How long a save waits for a lookup still on its way before it saves the flashcard as it is. */
export const saveLookupWaitMs = 10_000;

/** How long a save request may go unanswered, as when the connection hangs, before it counts as failed. */
export const saveRequestLimitMs = 30_000;
