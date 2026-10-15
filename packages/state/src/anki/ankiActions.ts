import type { SavePathPick } from "../platform/effects.ts";
import type { AnkiExportScope } from "./ankiExportDialog.ts";

/**
 * The action creators of the project overview's Anki exports and AnkiConnect sends.
 * Each acts on the project the overview shows.
 */
export const ankiActions = {
  /** The user opened the dialog that exports the flashcards as an Anki package. */
  ankiExportOpened: () => ({ type: "ankiExportOpened" }) as const,
  /** The user chose whether to export only the cards new or changed since they were last marked as exported, or all of them. */
  ankiExportScopeChosen: (scope: AnkiExportScope) =>
    ({ type: "ankiExportScopeChosen", scope }) as const,
  /** The user ticked or cleared a media file whose cards the export includes. */
  ankiExportMediaToggled: (mediaFileId: string) =>
    ({ type: "ankiExportMediaToggled", mediaFileId }) as const,
  /** The user pressed Export, which asks the platform where to save the package. */
  ankiExportConfirmed: () => ({ type: "ankiExportConfirmed" }) as const,
  /** The platform answered where to save the package. */
  ankiExportPathPicked: (pick: SavePathPick) =>
    ({ type: "ankiExportPathPicked", pick }) as const,
  /** The user closed the export dialog, which stops an export under way. */
  ankiExportClosed: () => ({ type: "ankiExportClosed" }) as const,
  /** The user opened the dialog that explains how to set up AnkiConnect. */
  ankiConnectSetupOpened: () => ({ type: "ankiConnectSetupOpened" }) as const,
  ankiConnectSetupClosed: () => ({ type: "ankiConnectSetupClosed" }) as const,
  /** The user chose to send the project's flashcards to Anki through AnkiConnect from now on. */
  ankiConnectSetupRequested: () =>
    ({ type: "ankiConnectSetupRequested" }) as const,
  /** The user asked whether Anki can be reached now. */
  ankiConnectionCheckRequested: () =>
    ({ type: "ankiConnectionCheckRequested" }) as const,
  /** The user asked to send every flashcard Anki does not have yet. */
  ankiSendRequested: () => ({ type: "ankiSendRequested" }) as const,
  /** The user chose to pick where the project's flashcards go anew. */
  flashcardDestinationCleared: () =>
    ({ type: "flashcardDestinationCleared" }) as const,
};

/** An action of the project overview's Anki exports and AnkiConnect sends. */
export type AnkiAction = ReturnType<
  (typeof ankiActions)[keyof typeof ankiActions]
>;
