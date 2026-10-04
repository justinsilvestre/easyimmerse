import { useUpdateFlashcardMutation } from "@easyimmerse/backend";
import { actions } from "@easyimmerse/state";
import type { Flashcard, SaveFlashcardRequest } from "@easyimmerse/types";
import { useAppDispatch } from "../../hooks/useAppDispatch.ts";
import { useFrameCapture } from "./useFlashcardEditing.ts";

/**
 * Saves the changes made by dragging the handles of a saved flashcard that is not open in the editor:
 * a clip edge moves the clip, and the screenshot marker takes a new screenshot at its time.
 */
export function useSavedFlashcardGestures(
  projectId: string,
  flashcards: readonly Flashcard[],
) {
  const dispatch = useAppDispatch();
  const captureFrameAt = useFrameCapture();
  const [updateFlashcard] = useUpdateFlashcardMutation();
  const save = (
    flashcard: Flashcard,
    changes: Partial<SaveFlashcardRequest["fields"]>,
    screenshotDataUrl: string | null,
  ) =>
    updateFlashcard({
      projectId,
      flashcardId: flashcard.id,
      request: {
        media_file_id: flashcard.media_file_id,
        fields: { ...flashcard.fields, ...changes },
        included_fields: flashcard.included_fields,
        screenshot_data_url: screenshotDataUrl,
      },
    })
      .unwrap()
      .catch(() =>
        dispatch(
          actions.notificationRequested("The flashcard could not be saved."),
        ),
      );
  const find = (id: string) =>
    flashcards.find((flashcard) => flashcard.id === id);
  return {
    moveClipEndpoint: (
      flashcardId: string,
      endpoint: "start" | "end",
      timeMs: number,
    ) => {
      const flashcard = find(flashcardId);
      const clip = flashcard?.fields.audio_context;
      if (!flashcard || !clip) return;
      const key = endpoint === "start" ? "start_ms" : "end_ms";
      save(
        flashcard,
        { audio_context: { ...clip, [key]: Math.round(timeMs) } },
        null,
      );
    },
    moveScreenshot: async (flashcardId: string, timeMs: number) => {
      const flashcard = find(flashcardId);
      if (!flashcard) return;
      const screenshot = await captureFrameAt(timeMs);
      if (screenshot)
        save(flashcard, { screenshot_at_ms: screenshot.at_ms }, screenshot.url);
    },
  };
}
