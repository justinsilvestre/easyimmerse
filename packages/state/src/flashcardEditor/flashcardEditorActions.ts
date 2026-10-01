import type { FlashcardFieldKind, NewFlashcard } from "@easyimmerse/types";

export const flashcardEditorActions = {
  /** Opens the editor on a new card when the id is null, or on the saved card with that id. */
  flashcardEditorOpened: (
    projectId: string,
    card: NewFlashcard,
    flashcardId: string | null,
  ) =>
    ({ type: "flashcardEditorOpened", projectId, card, flashcardId }) as const,
  flashcardFieldEdited: (kind: FlashcardFieldKind, value: string) =>
    ({ type: "flashcardFieldEdited", kind, value }) as const,
  /** Adds the field when the card lacks it, and removes it otherwise. */
  flashcardFieldToggled: (kind: FlashcardFieldKind) =>
    ({ type: "flashcardFieldToggled", kind }) as const,
  flashcardTagsEdited: (tags: readonly string[]) =>
    ({ type: "flashcardTagsEdited", tags }) as const,
  flashcardEditorClosed: () => ({ type: "flashcardEditorClosed" }) as const,
  frameCaptureRequested: () => ({ type: "frameCaptureRequested" }) as const,
  /** Carries a PNG data URL of the video frame, or null when none could be captured. */
  frameCaptured: (dataUrl: string | null) =>
    ({ type: "frameCaptured", dataUrl }) as const,
};
