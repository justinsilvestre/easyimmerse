import type { AudioClip, Flashcard, NewFlashcard } from "@easyimmerse/types";
import type { FailedRequest } from "../operations/failedRequests.ts";
import type { EditorAction } from "./editFlashcard.ts";
import type { FlashcardCard } from "./flashcardCard.ts";
import type { SaveUndo } from "./flashcardSaves.ts";
import type { LibraryFlashcardPlace } from "./libraryFlashcards.ts";
import type { LookupFlashcardFields } from "./lookupFields.ts";

/** Whether a flashcard is saved at once, or opened in the flashcard-editing form. */
export type FlashcardDestination = "save" | "editor";

/** The action creators of the flashcards: the form's, the notices' and the status line's buttons, and the reports that fill and save cards. */
export const flashcardActions = {
  /** The user made a card that needs no lookup, such as one for no word or one the pop-up filled. Its id and draft were made by the dispatcher. */
  flashcardStarted: (
    flashcard: NewFlashcard,
    destination: FlashcardDestination,
  ) => ({ type: "flashcardStarted", flashcard, destination }) as const,
  /**
   * The user asked for a flashcard from a word or a segment of a library media file, by a double-click or a key.
   * It is saved at once, filled by the server from the library item's text.
   */
  libraryFlashcardRequested: (place: LibraryFlashcardPlace) =>
    ({ type: "libraryFlashcardRequested", place }) as const,
  /** A library flashcard that was asked for got its id, under which it is now sent. */
  libraryFlashcardStarted: (
    place: LibraryFlashcardPlace,
    flashcardId: string,
  ) => ({ type: "libraryFlashcardStarted", place, flashcardId }) as const,
  /**
   * The user opened a flashcard from its waveform segment or its cue's mark.
   * `listed` is the cached record, or null for a failed save that was never saved, which only the store holds.
   */
  flashcardOpened: (flashcardId: string, listed: Flashcard | null) =>
    ({ type: "flashcardOpened", flashcardId, listed }) as const,
  /** The user changed the open card: a field, the clip, the screenshot time or the included fields. */
  flashcardEdited: (edit: EditorAction) =>
    ({ type: "flashcardEdited", edit }) as const,
  /** The user dragged one end of a card's clip on the waveform to a time. Only the open card's handles can be dragged. */
  clipEndpointDragged: (
    segmentId: string,
    endpoint: "start" | "end",
    ms: number,
  ) => ({ type: "clipEndpointDragged", segmentId, endpoint, ms }) as const,
  /** The user dragged a card's screenshot marker on the waveform to a time. Only the open card's marker can be dragged. */
  screenshotMarkerDragged: (segmentId: string, ms: number) =>
    ({ type: "screenshotMarkerDragged", segmentId, ms }) as const,
  flashcardSaveRequested: () => ({ type: "flashcardSaveRequested" }) as const,
  /** The user closed the form without saving. */
  flashcardClosed: () => ({ type: "flashcardClosed" }) as const,
  flashcardDeleteRequested: () =>
    ({ type: "flashcardDeleteRequested" }) as const,
  /** The user asked to leave a flashcard out of the review until they unsuspend it. */
  flashcardSuspendRequested: (projectId: string, flashcardId: string) =>
    ({ type: "flashcardSuspendRequested", projectId, flashcardId }) as const,
  /** The user asked to bring a flashcard they suspended back into the review. */
  flashcardUnsuspendRequested: (projectId: string, flashcardId: string) =>
    ({ type: "flashcardUnsuspendRequested", projectId, flashcardId }) as const,
  /** Undo on the notice of a save, which takes the save back. */
  saveUndoRequested: (undo: SaveUndo) =>
    ({ type: "saveUndoRequested", undo }) as const,
  /** Undo on the notice of a form closed without saving, which reopens the card with its edits. */
  formDiscardUndone: (card: FlashcardCard) =>
    ({ type: "formDiscardUndone", card }) as const,
  failedSaveRetried: (flashcardId: string) =>
    ({ type: "failedSaveRetried", flashcardId }) as const,
  allFailedSavesRetried: () => ({ type: "allFailedSavesRetried" }) as const,
  /** Open on a failed save, which goes to its media file and opens it in the form there. */
  failedSaveOpened: (
    flashcardId: string,
    projectId: string,
    mediaFileId: string,
  ) =>
    ({
      type: "failedSaveOpened",
      flashcardId,
      projectId,
      mediaFileId,
    }) as const,
  /** The form opened a card, whose clip, if it has one, the player goes to. */
  flashcardFormOpened: (clip: AudioClip | null) =>
    ({ type: "flashcardFormOpened", clip }) as const,
  failedSaveDiscarded: (flashcardId: string) =>
    ({ type: "failedSaveDiscarded", flashcardId }) as const,
  /** Undo on the notice of a failed save discarded, which lists it again. */
  failedSaveDiscardUndone: (kept: FailedRequest) =>
    ({ type: "failedSaveDiscardUndone", kept }) as const,
  /** The ten seconds a card waits for its word's lookup before it is saved without it have passed. */
  flashcardLookupWaitEnded: (flashcardId: string) =>
    ({ type: "flashcardLookupWaitEnded", flashcardId }) as const,
  /** The lookup request with this id has settled, and the fields it fills are written, or null when it found nothing or failed. */
  flashcardFieldsWritten: (
    requestId: string,
    fields: LookupFlashcardFields | null,
  ) => ({ type: "flashcardFieldsWritten", requestId, fields }) as const,
};

/** An action of the flashcards. */
export type FlashcardAction = ReturnType<
  (typeof flashcardActions)[keyof typeof flashcardActions]
>;
