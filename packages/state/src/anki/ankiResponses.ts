/** Whether Anki answered through AnkiConnect, with the add-on's API version when it did. */
export type AnkiConnection =
  | { connected: true; version: number }
  | { connected: false };

/** How a send of flashcards to Anki through AnkiConnect went. */
export type AnkiSendOutcome = {
  /** The flashcards Anki added or updated a note for. */
  sentCount: number;
  /** The flashcards Anki refused, such as one whose word is empty. */
  failedCount: number;
  /** The audio clips and screenshots that could not be rendered and are missing from the notes. */
  skippedMediaCount: number;
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
