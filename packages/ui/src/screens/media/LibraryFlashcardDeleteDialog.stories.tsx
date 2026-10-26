import { actions } from "@easyimmerse/state";
import type { Flashcard } from "@easyimmerse/types";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { exampleFlashcard } from "../../components/flashcards/exampleFlashcard.ts";
import { withAppStore } from "../../storybook/withAppStore.tsx";
import { withDispatchedActions } from "../../storybook/withDispatchedActions.tsx";
import { LibraryFlashcardDeleteDialog } from "./LibraryFlashcardDeleteDialog.tsx";

const libraryFlashcard: Flashcard = {
  id: "f9",
  project_id: "p1",
  media_file_id: "m3",
  cue_index: 0,
  word_start: 4,
  content: { ...exampleFlashcard, word: "Hund" },
  included_fields: ["word", "l1_definition"],
  created_at_ms: 0,
  updated_at_ms: 0,
  exported_at_ms: null,
  was_packaged: false,
  sent_at_ms: null,
  is_suspended: false,
  is_from_library: true,
};

const meta = {
  title: "Screens/Media/LibraryFlashcardDeleteDialog",
  component: LibraryFlashcardDeleteDialog,
  decorators: [withAppStore],
  args: { projectId: "p1", flashcards: [libraryFlashcard] },
} satisfies Meta<typeof LibraryFlashcardDeleteDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The user chose "Delete flashcard" in the menu of a flashcard made from the library, which asks before deleting it. */
export const AskingToDelete: Story = {
  decorators: [
    withDispatchedActions(
      actions.libraryDeletionAsked({ kind: "flashcard", flashcardId: "f9" }),
    ),
  ],
};
