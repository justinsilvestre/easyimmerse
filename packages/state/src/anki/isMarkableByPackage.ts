import type { AnkiPendingDeletion } from "@easyimmerse/types";

/**
 * Tells whether a package's deletion mark reaches every note the deleted flashcard may have in Anki:
 * the flashcard reached Anki only in packages marking it exported, whose notes carry the GUID the mark shares.
 * A note AnkiConnect added carries a GUID Anki chose, which no mark reaches.
 */
export function isMarkableByPackage({
  reached_by_package,
  reached_by_anki_connect,
}: AnkiPendingDeletion): boolean {
  return reached_by_package && !reached_by_anki_connect;
}
