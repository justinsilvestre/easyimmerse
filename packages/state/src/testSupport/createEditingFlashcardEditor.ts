import type { NewFlashcard } from "@easyimmerse/types";
import type { FlashcardEditorState } from "../flashcardEditor/flashcardEditorState.ts";
import { createNewFlashcard } from "./createNewFlashcard.ts";

type EditingFlashcardEditor = Extract<
  FlashcardEditorState,
  { kind: "editing" }
>;

/** Builds the state of an editor open on a new card, changed by the overrides. */
export function createEditingFlashcardEditor(
  card: NewFlashcard = createNewFlashcard(),
  overrides: Partial<EditingFlashcardEditor> = {},
): FlashcardEditorState {
  return {
    kind: "editing",
    projectId: "p1",
    flashcardId: null,
    card,
    resumePlaybackOnClose: false,
    ...overrides,
  };
}
