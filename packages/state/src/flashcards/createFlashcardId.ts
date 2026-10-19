/** The Web Crypto API, which every platform the store runs on provides, though the store itself is compiled for no platform. */
declare const crypto: { getRandomValues(array: Uint8Array): Uint8Array };

/** Creates the id a new flashcard is saved under, in the form of the ids the backend makes: 32 lowercase hexadecimal digits. */
export function createFlashcardId(): string {
  // crypto.getRandomValues works outside secure contexts too, unlike crypto.randomUUID.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}
