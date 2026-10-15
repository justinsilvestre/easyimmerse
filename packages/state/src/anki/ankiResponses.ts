/**
 * Whether Anki answered through AnkiConnect, with the add-on's API version when it did,
 * or whether it refused easyImmerse when it did not.
 */
export type AnkiConnection =
  | { connected: true; version: number }
  | { connected: false; isDenied: boolean };

/** How a send of flashcards to Anki through AnkiConnect went. */
export type AnkiSendOutcome = {
  /** The flashcards Anki added or updated a note for. */
  sentCount: number;
  /** The flashcards Anki refused, such as one whose word is empty. */
  failedCount: number;
  /** The audio clips and screenshots that could not be rendered and are missing from the notes. */
  skippedMediaCount: number;
  /** Whether the server recorded which notes Anki holds. The flashcards it did not record still count as unsent. */
  isRecorded: boolean;
  /** Whether Anki answered although the app had not known it to be running, so that what waited for Anki can follow. */
  foundAnki: boolean;
};

/** How the deletion from Anki of the notes of a project's deleted flashcards went. */
export type AnkiDeletionOutcome = {
  /** The notes Anki deleted. */
  deletedCount: number;
  /** The ids of the deleted flashcards whose notes Anki deleted. */
  deletedFlashcardIds: readonly string[];
  /** The ids of the deleted flashcards whose notes are still to be deleted, because Anki stopped answering. */
  remainingFlashcardIds: readonly string[];
  /** The deleted flashcards whose notes Anki no longer holds, but which the server could not record as done and keeps pending. */
  unrecordedCount: number;
  /** Whether Anki answered although the app had not known it to be running, so that what waited for Anki can follow. */
  foundAnki: boolean;
};

/**
 * An exported Anki package: written by the server to the path the user chose,
 * or handed back as a file for the platform to download.
 */
export type AnkiPackageExport =
  | { kind: "saved"; flashcardCount: number; skippedMediaCount: number }
  | {
      kind: "downloaded";
      fileName: string;
      bytes: Uint8Array<ArrayBuffer>;
      flashcardCount: number;
      skippedMediaCount: number;
    };
