import {
  useCreateFlashcardMutation,
  useDeleteFlashcardMutation,
  useLazyGetFlashcardScreenshotQuery,
  useUpdateFlashcardMutation,
} from "@easyimmerse/backend";
import { actions } from "@easyimmerse/state";
import type { Flashcard, FlashcardFieldKey, Project } from "@easyimmerse/types";
import { useState } from "react";
import {
  type EditorAction,
  type EditorState,
  reduceEditor,
} from "../../flashcards/editFlashcard.ts";
import type {
  FlashcardContent,
  Screenshot,
} from "../../flashcards/flashcardFields.ts";
import { useAppDispatch } from "../../hooks/useAppDispatch.ts";
import { usePlayerRegistry } from "../../playerRegistryContext.ts";
import {
  contentOfFlashcard,
  saveRequestOf,
  unsavedFlashcardId,
} from "./flashcardRecords.ts";
import type { NewFlashcard } from "./useFlashcardCreation.ts";

/** The flashcard open in the editor: its id (or the unsaved id), the screenshot the server holds, and the form's state. */
export type Editing = {
  flashcardId: string;
  storedScreenshotUrl: string | null;
  state: EditorState;
};

/**
 * Opens new and saved flashcards in the editor, keeps the editor's state, and saves or deletes the flashcard.
 * Moving the screenshot time captures the frame at the new time.
 */
export function useFlashcardEditing(project: Project, mediaFileId: string) {
  const dispatchApp = useAppDispatch();
  const captureFrameAt = useFrameCapture();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [fetchScreenshot] = useLazyGetFlashcardScreenshotQuery();
  const [createFlashcard] = useCreateFlashcardMutation();
  const [updateFlashcard] = useUpdateFlashcardMutation();
  const [deleteFlashcard] = useDeleteFlashcardMutation();
  const notify = (message: string) =>
    dispatchApp(actions.notificationRequested(message));
  const dispatch = (action: EditorAction) => {
    setEditing(
      (current) =>
        current && { ...current, state: reduceEditor(current.state, action) },
    );
    if (action.type === "screenshotMsChanged")
      captureFrameAt(action.ms).then((screenshot) => {
        if (screenshot) dispatch({ type: "screenshotCaptured", screenshot });
      });
  };
  const projectId = project.id;
  return {
    editing,
    dispatch,
    /** Opens a new flashcard at once; its screenshot is added once the frame has been captured. */
    startNew: ({ content, screenshotMs }: NewFlashcard) => {
      dispatchApp(actions.pauseRequested());
      captureFrameAt(screenshotMs).then((screenshot) => {
        if (screenshot) dispatch({ type: "screenshotCaptured", screenshot });
      });
      setEditing({
        flashcardId: unsavedFlashcardId,
        storedScreenshotUrl: null,
        state: {
          content,
          includedFields: project.settings.flashcard_fields,
        },
      });
    },
    openSaved: async (flashcard: Flashcard) => {
      dispatchApp(actions.pauseRequested());
      const screenshotUrl = flashcard.has_screenshot_image
        ? await fetchScreenshot({ projectId, flashcardId: flashcard.id })
            .unwrap()
            .then((found) => found.data_url)
            .catch(() => null)
        : null;
      setEditing({
        flashcardId: flashcard.id,
        storedScreenshotUrl: screenshotUrl,
        state: {
          content: contentOfFlashcard(flashcard, screenshotUrl),
          includedFields: flashcard.included_fields,
        },
      });
    },
    save: (content: FlashcardContent, fields: readonly FlashcardFieldKey[]) => {
      if (editing === null) return;
      const request = saveRequestOf(
        content,
        fields,
        mediaFileId,
        editing.storedScreenshotUrl,
      );
      const saved =
        editing.flashcardId === unsavedFlashcardId
          ? createFlashcard({ projectId, request })
          : updateFlashcard({
              projectId,
              flashcardId: editing.flashcardId,
              request,
            });
      saved
        .unwrap()
        .then(() => {
          setEditing(null);
          notify("Flashcard saved to the project.");
        })
        .catch(() => notify("The flashcard could not be saved."));
    },
    remove: () => {
      if (editing === null) return;
      setEditing(null);
      if (editing.flashcardId === unsavedFlashcardId) return;
      deleteFlashcard({ projectId, flashcardId: editing.flashcardId })
        .unwrap()
        .catch(() => notify("The flashcard could not be deleted."));
    },
    close: () => setEditing(null),
  };
}

/** Captures the video frame at a time through the registered player, or gives null for media without a picture. */
export function useFrameCapture() {
  const playerRegistry = usePlayerRegistry();
  return async (ms: number): Promise<Screenshot | null> => {
    const url = await playerRegistry
      .current()
      ?.captureFrameAt(ms / 1000)
      .catch(() => null);
    return url ? { url, at_ms: Math.round(ms) } : null;
  };
}
