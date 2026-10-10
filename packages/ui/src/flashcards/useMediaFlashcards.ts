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
import { flashcardRetiming } from "./flashcardRetiming.ts";
import { flashcardSegmentsOf } from "./flashcardSegmentsOf.ts";

/**
 * The flashcards made from one media file, as the store holds them, with the card open in the form and the ways to edit, save, close and delete it.
 * The waveform draws each card with the content the app holds for it; its handles edit only the open card.
 */
export function useMediaFlashcards(projectId: string, mediaFileId: string) {
  const dispatch = useAppDispatch();
  const listed = useListFlashcardsQuery(projectId).data?.flashcards;
  const form = useAppSelector(selectFlashcardForm);
  const { flashcards, drawn } = useAppSelector((state) =>
    selectMediaFlashcards(state, listed, mediaFileId),
  );
  const edit = (action: EditorAction) =>
    dispatch(actions.flashcardEdited(action));
  /** Opens a listed flashcard, or a failed save never saved, which goes to the form with its edits. */
  const open = (id: string) => {
    const card = flashcards.find((flashcard) => flashcard.id === id);
    if (card) dispatch(actions.flashcardOpened(card));
    else if (drawn.some((flashcard) => flashcard.id === id))
      dispatch(actions.failedSaveOpened(id, projectId, mediaFileId));
  };
  return {
    flashcards,
    segments: flashcardSegmentsOf(drawn),
    cueIndexes: flashcards.flatMap((flashcard) =>
      flashcard.cue_index === null ? [] : [flashcard.cue_index],
    ),
    form,
    /** The waveform segment of the open card, the only one whose clip and screenshot time can be dragged, or null when no card is open. */
    editedSegmentId: form && segmentIdOf(form.card),
    edit,
    open,
    /** Opens the card made from the cue at `cueIndex` of the target-language subtitles, when there is one. */
    openForCue: (cueIndex: number) => {
      const card = flashcards.find((listed) => listed.cue_index === cueIndex);
      if (card) open(card.id);
    },
    save: () => dispatch(actions.flashcardSaveRequested()),
    close: () => dispatch(actions.flashcardClosed()),
    remove: () => dispatch(actions.flashcardDeleteRequested()),
    ...flashcardRetiming(form, edit),
  };
}
