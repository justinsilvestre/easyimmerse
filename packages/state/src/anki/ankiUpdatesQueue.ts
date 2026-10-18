import type { Flashcard } from "@easyimmerse/types";

/**
 * Returns when the flashcard was last delivered to Anki, or null when it never was.
 * A delivery is a send through AnkiConnect or an export that marked the flashcard as exported, so the later of the two counts.
 */
function lastDeliveredAtMs({ exported_at_ms, sent_at_ms }: Flashcard) {
  if (exported_at_ms === null) return sent_at_ms;
  if (sent_at_ms === null) return exported_at_ms;
  return Math.max(exported_at_ms, sent_at_ms);
}

/** Tells whether the flashcard was ever sent to Anki through AnkiConnect. */
export const isSentThroughAnkiConnect = ({ sent_at_ms }: Flashcard) =>
  sent_at_ms !== null;

/** Tells whether the flashcard was ever marked as exported in an Anki deck package. */
export const isExportedInPackage = ({ exported_at_ms }: Flashcard) =>
  exported_at_ms !== null;

/** Tells whether the flashcard was never sent through AnkiConnect or marked as exported. */
export const isNeverDelivered = (flashcard: Flashcard) =>
  lastDeliveredAtMs(flashcard) === null;

/**
 * Tells whether the flashcard was edited at or after its last delivery to Anki.
 * An edit in the same millisecond counts, since the delivery may have read the flashcard before it.
 */
export function isChangedSinceDelivered(flashcard: Flashcard) {
  const deliveredAtMs = lastDeliveredAtMs(flashcard);
  return deliveredAtMs !== null && flashcard.updated_at_ms >= deliveredAtMs;
}

/** Tells whether the flashcard is in the project's Anki updates queue: never delivered to Anki, or changed since. */
export const isQueued = (flashcard: Flashcard) =>
  isNeverDelivered(flashcard) || isChangedSinceDelivered(flashcard);
