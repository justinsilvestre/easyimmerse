import { useListFlashcardsQuery } from "@easyimmerse/backend";
import {
  actions,
  type EditorAction,
  segmentIdOf,
  selectFlashcardForm,
  selectMediaFlashcards,
} from "@easyimmerse/state";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { useAppStore } from "../hooks/useAppStore.ts";
import { flashcardRetiming } from "./flashcardRetiming.ts";
import { selectFlashcardSegments } from "./selectFlashcardSegments.ts";

/**
 * The flashcards made from one media file, as the store holds them, with the waveform segment of the card open in the form,
 * and the ways to open a card and retime the open one.
 * The waveform draws each card with the content the app holds for it; its handles edit only the open card.
 * None of it changes while the open card's text is edited, so a screen using it does not render again on each keystroke.
 */
export function useMediaFlashcards(projectId: string, mediaFileId: string) {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const listed = useListFlashcardsQuery(projectId).data?.flashcards;
  const flashcards = useAppSelector(
    (state) => selectMediaFlashcards(state, listed, mediaFileId).flashcards,
  );
  const segments = useAppSelector((state) =>
    selectFlashcardSegments(state, listed, mediaFileId),
  );
  const editedSegmentId = useAppSelector((state) => {
    const form = selectFlashcardForm(state.app);
    return form && segmentIdOf(form.card);
  });
  const edit = (action: EditorAction) =>
    dispatch(actions.flashcardEdited(action));
  /** Opens a listed flashcard, or a failed save never saved, which goes to the form with its edits. */
  const open = (id: string) => {
    const card = flashcards.find((flashcard) => flashcard.id === id) ?? null;
    dispatch(actions.flashcardOpened(id, card));
  };
  return {
    flashcards,
    segments,
    cueIndexes: flashcards.flatMap((flashcard) =>
      flashcard.cue_index === null ? [] : [flashcard.cue_index],
    ),
    /** The waveform segment of the open card, the only one whose clip and screenshot time can be dragged, or null when no card is open. */
    editedSegmentId,
    open,
    /** Opens the card made from the cue at `cueIndex` of the target-language subtitles, when there is one. */
    openForCue: (cueIndex: number) => {
      const card = flashcards.find((listed) => listed.cue_index === cueIndex);
      if (card) open(card.id);
    },
    ...flashcardRetiming(() => selectFlashcardForm(store.getState().app), edit),
  };
}
