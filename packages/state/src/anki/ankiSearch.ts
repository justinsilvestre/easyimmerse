/** The name of the field in which every note of an easyImmerse note type holds its flashcard's id. */
const flashcardIdField = "easyImmerse id";

/**
 * Returns the Anki search that finds the note holding a flashcard's id, with the characters Anki's search treats specially escaped.
 * The whole term is quoted, as Anki's search requires for a field whose name has a space, and it matches the whole field.
 */
export function flashcardNoteQuery(flashcardId: string): string {
  const escaped = flashcardId.replace(
    /[\\"*_:]/g,
    (character) => `\\${character}`,
  );
  return `"${flashcardIdField}:${escaped}"`;
}

/** Returns the Anki search that finds the notes holding any of the flashcards' ids. */
export function ankiSearchOf(flashcardIds: readonly string[]): string {
  return flashcardIds.map(flashcardNoteQuery).join(" OR ");
}
