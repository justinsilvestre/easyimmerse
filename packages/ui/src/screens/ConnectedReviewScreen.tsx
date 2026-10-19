import {
  useGetProjectQuery,
  useGetReviewSummaryQuery,
  useListFlashcardsQuery,
} from "@easyimmerse/backend";
import {
  actions,
  selectAnkiFateOfDeletion,
  selectReviewKeyBinding,
  selectReviewSession,
} from "@easyimmerse/state";
import type { ReviewIntervals } from "@easyimmerse/types";
import { FlashcardDeleteDialog } from "../flashcards/FlashcardDeleteDialog.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { useKeyBindings } from "../hooks/useKeyBindings.ts";
import { formatInterval } from "../review/formatInterval.ts";
import type { ReviewGrade } from "../review/RatingBar.tsx";
import { useReviewCardView } from "../review/useReviewCardView.ts";
import { ReviewScreen } from "./ReviewScreen.tsx";

const noIntervals = {
  again: "",
  hard: "",
  good: "",
  easy: "",
} satisfies Record<ReviewGrade, string>;

/**
 * The review of a project's flashcards as the store holds it, with its keys, the card's media,
 * and the confirmation of the shown card's deletion. Each action is dated as the user takes it,
 * which times how long a card was looked at.
 */
export function ConnectedReviewScreen({
  projectId,
  onBack,
}: {
  projectId: string;
  onBack: () => void;
}) {
  const dispatch = useAppDispatch();
  const project = useGetProjectQuery(projectId).data;
  // The end of the session reads when the next review is due from this query's cached answer.
  useGetReviewSummaryQuery(projectId, { refetchOnMountOrArgChange: true });
  // The deletion's confirmation tells what becomes of the card in Anki from the cached flashcards.
  useListFlashcardsQuery(projectId);
  const session = useAppSelector(selectReviewSession);
  const shown = session?.card ?? null;
  const card = useReviewCardView(projectId, shown);
  const ankiFate = useAppSelector(
    (state) =>
      shown && selectAnkiFateOfDeletion(state, projectId, shown.flashcard.id),
  );
  const showAnswer = () => dispatch(actions.reviewAnswerShown(Date.now()));
  const rate = (rating: ReviewGrade) =>
    dispatch(actions.reviewRated(rating, Date.now()));
  useKeyBindings((root, press) => selectReviewKeyBinding(root.app, press), {
    showAnswer,
    rate: ({ rating }) => rate(rating),
  });
  if (session === null || project === undefined) return null;
  const { settings } = project;
  return (
    <>
      <ReviewScreen
        projectName={settings.name}
        card={card}
        stage={session.stage}
        end={session.end}
        progress={session.progress}
        intervals={shown ? intervalsOf(shown.intervals) : noIntervals}
        buttons="two"
        canUndo={session.canUndo}
        includedFields={settings.flashcard_fields}
        frontFields={settings.flashcard_front_fields}
        languages={{
          target: settings.target_language,
          translation: settings.translation_language,
        }}
        audioPlayKey={session.audioPlayKey}
        onShowAnswer={showAnswer}
        onRate={rate}
        onReplayAudio={() => dispatch(actions.reviewAudioReplayed())}
        onUndo={() => dispatch(actions.reviewUndoRequested())}
        onBack={onBack}
        onLearnMore={() => dispatch(actions.reviewAllowanceRaised())}
        onRetry={() => dispatch(actions.reviewQueueRetried())}
        onEditFlashcard={
          shown?.flashcard.media_file_id
            ? () => dispatch(actions.reviewFlashcardEditRequested())
            : null
        }
        onDeleteFlashcard={() =>
          dispatch(actions.reviewFlashcardDeleteRequested())
        }
      />
      {session.isConfirmingDelete && shown && (
        <FlashcardDeleteDialog
          word={shown.flashcard.content.word}
          ankiFate={ankiFate}
          onCancel={() => dispatch(actions.reviewFlashcardDeleteCancelled())}
          onDelete={() =>
            dispatch(actions.reviewFlashcardDeleteConfirmed(Date.now()))
          }
        />
      )}
    </>
  );
}

function intervalsOf(intervals: ReviewIntervals) {
  return {
    again: formatInterval(intervals.again_ms),
    hard: formatInterval(intervals.hard_ms),
    good: formatInterval(intervals.good_ms),
    easy: formatInterval(intervals.easy_ms),
  } satisfies Record<ReviewGrade, string>;
}
