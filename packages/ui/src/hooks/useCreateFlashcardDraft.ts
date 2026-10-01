import { useDraftFlashcardMutation } from "@easyimmerse/backend";
import type { WordHover } from "@easyimmerse/state";
import { actions, selectHasScreenshotField } from "@easyimmerse/state";
import type { Cue, MediaFile, Project } from "@easyimmerse/types";
import { describeBackendError } from "../describeBackendError.ts";
import {
  buildFlashcardDraftRequest,
  type DraftDefinitions,
} from "../screens/buildFlashcardDraftRequest.ts";
import { useAppDispatch } from "./useAppDispatch.ts";
import { useAppStore } from "./useAppStore.ts";
import { useLookUpWord } from "./useLookUpWord.ts";

/**
 * Returns a function that drafts a flashcard for a word and opens it in the flashcard editor.
 * Without definitions, it looks the word up first. For a video whose card has a screenshot field, it also captures the frame.
 */
export function useCreateFlashcardDraft(
  project: Project,
  media: MediaFile,
  translationCues: readonly Cue[] | null,
): (hover: WordHover, definitions?: DraftDefinitions) => Promise<void> {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const lookUpWord = useLookUpWord();
  const [draftFlashcard] = useDraftFlashcardMutation();
  return async (hover, definitions) => {
    const request = buildFlashcardDraftRequest(
      hover,
      definitions ?? { picked: null, results: await lookUpWord(hover.word) },
      { file: media, translationCues },
      project.settings,
    );
    const result = await draftFlashcard(request);
    if ("error" in result) {
      const reason = describeBackendError(result.error);
      dispatch(
        actions.notificationRequested(`Could not make a flashcard: ${reason}`),
      );
      return;
    }
    dispatch(actions.flashcardEditorOpened(project.id, result.data, null));
    if (media.kind === "video" && selectHasScreenshotField(store.getState()))
      dispatch(actions.frameCaptureRequested());
  };
}
