import {
  useCreateFlashcardMutation,
  useDeleteFlashcardMutation,
  useLazyGetFlashcardScreenshotQuery,
  useUpdateFlashcardMutation,
} from "@easyimmerse/backend";
import { actions } from "@easyimmerse/state";
import type { Flashcard, FlashcardFieldKey, Project } from "@easyimmerse/types";
import { useRef, useState } from "react";
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
  // Counts the flashcards opened, so that a capture or save that finishes late cannot touch another flashcard.
  const session = useRef(0);
  const isSaving = useRef(false);
  const notify = (message: string) =>
    dispatchApp(actions.notificationRequested(message));
  const open = (next: Editing | null) => {
    session.current += 1;
    isSaving.current = false;
    setEditing(next);
  };
  const dispatch = (action: EditorAction) => {
    setEditing(
      (current) =>
        current && { ...current, state: reduceEditor(current.state, action) },
    );
    if (action.type === "screenshotMsChanged") captureInto(action.ms);
  };
  /** Captures the frame at the time and adds it to the flashcard open now, if it is still open when the frame arrives. */
  const captureInto = (ms: number) => {
    const capturedIn = session.current;
    captureFrameAt(ms).then((screenshot) => {
      if (screenshot && session.current === capturedIn)
        dispatch({ type: "screenshotCaptured", screenshot });
    });
  };
  const projectId = project.id;
  return {
    editing,
    dispatch,
    /** Opens a new flashcard at once; its screenshot is added once the frame has been captured. */
    startNew: ({ content, screenshotMs }: NewFlashcard) => {
      dispatchApp(actions.pauseRequested());
      open({
        flashcardId: unsavedFlashcardId,
        storedScreenshotUrl: null,
        state: {
          content,
          includedFields: project.settings.flashcard_fields,
        },
      });
      captureInto(screenshotMs);
    },
    /** Opens a saved flashcard. Without its stored screenshot it is not opened, since saving it would remove the screenshot. */
    openSaved: async (flashcard: Flashcard) => {
      dispatchApp(actions.pauseRequested());
      const screenshotUrl = flashcard.has_screenshot_image
        ? await fetchScreenshot({ projectId, flashcardId: flashcard.id })
            .unwrap()
            .then((found) => found.data_url)
            .catch(() => undefined)
        : null;
      if (screenshotUrl === undefined)
        return notify("The flashcard's screenshot could not be loaded.");
      open({
        flashcardId: flashcard.id,
        storedScreenshotUrl: screenshotUrl,
        state: {
          content: contentOfFlashcard(flashcard, screenshotUrl),
          includedFields: flashcard.included_fields,
        },
      });
    },
    save: (content: FlashcardContent, fields: readonly FlashcardFieldKey[]) => {
      if (editing === null || isSaving.current) return;
      isSaving.current = true;
      const savedIn = session.current;
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
          if (session.current === savedIn) open(null);
          notify("Flashcard saved to the project.");
        })
        .catch(() => {
          isSaving.current = false;
          notify("The flashcard could not be saved.");
        });
    },
    remove: () => {
      if (editing === null) return;
      open(null);
      if (editing.flashcardId === unsavedFlashcardId) return;
      deleteFlashcard({ projectId, flashcardId: editing.flashcardId })
        .unwrap()
        .catch(() => notify("The flashcard could not be deleted."));
    },
    close: () => open(null),
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
