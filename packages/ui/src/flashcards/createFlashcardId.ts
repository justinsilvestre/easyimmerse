/** Creates the id a new flashcard is saved under, in the form of the ids the backend makes: 32 lowercase hexadecimal digits. */
export function createFlashcardId(): string {
  // crypto.getRandomValues works outside secure contexts too, unlike crypto.randomUUID.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}
