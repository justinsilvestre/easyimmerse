import type { NewFlashcard } from "@easyimmerse/types";

export type FlashcardEditorState =
  | { kind: "closed" }
  | {
      kind: "editing";
      projectId: string;
      /** The id of the saved card being edited, or null for a new card. */
      flashcardId: string | null;
      card: NewFlashcard;
      /** Whether media was playing before the editor, or the lookup it replaced, interrupted it, so that it plays again once the editor closes. */
      resumePlaybackOnClose: boolean;
    };

export const closedFlashcardEditor: FlashcardEditorState = { kind: "closed" };
