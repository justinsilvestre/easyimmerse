import {
  useGetProjectQuery,
  useGetReviewSummaryQuery,
  useListFlashcardsQuery,
} from "@easyimmerse/backend";
import {
  actions,
  selectAnkiFateOfDeletion,
  selectPreference,
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
  // The cards' content comes from the cached flashcards, and so does what the deletion's confirmation tells of Anki.
  useListFlashcardsQuery(projectId);
  const session = useAppSelector(selectReviewSession);
  const shown = session?.card ?? null;
  const card = useReviewCardView(projectId, shown);
  const ankiFate = useAppSelector(
    (state) =>
      shown && selectAnkiFateOfDeletion(state, projectId, shown.flashcard.id),
  );
  const areIntervalsShown =
    useAppSelector(selectPreference("showReviewIntervals")) === "true";
  const showAnswer = () => dispatch(actions.reviewAnswerShown(Date.now()));
  const rate = (rating: ReviewGrade) =>
    dispatch(actions.reviewRated(rating, Date.now()));
  useKeyBindings((root, press) => selectReviewKeyBinding(root.app, press), {
    showAnswer,
    rate: ({ rating }) => rate(rating),
  });
  if (session === null || project === undefined) return null;
  const mediaFileId = shown?.flashcard.media_file_id ?? null;
  const { settings } = project;
  return (
    <>
      <ReviewScreen
        projectName={settings.name}
        card={card}
        leechLapseCount={session.leechLapseCount}
        isScreenshotExpanded={session.isScreenshotExpanded}
        stage={session.stage}
        end={session.end}
        progress={session.progress}
        intervals={
          shown && areIntervalsShown ? intervalsOf(shown.intervals) : null
        }
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
        onExpandScreenshot={() => dispatch(actions.reviewScreenshotExpanded())}
        onCloseScreenshot={() => dispatch(actions.reviewScreenshotClosed())}
        onUndo={() => dispatch(actions.reviewUndoRequested())}
        onBack={onBack}
        onLearnMore={() => dispatch(actions.reviewAllowanceRaised())}
        onReviewMore={(reviewCount) =>
          dispatch(actions.reviewMoreReviewsRequested(reviewCount))
        }
        onRetry={() => dispatch(actions.reviewQueueRetried())}
        onEditFlashcard={
          mediaFileId === null
            ? null
            : () => dispatch(actions.reviewFlashcardEditRequested(mediaFileId))
        }
        isFromLibrary={shown?.flashcard.is_from_library ?? false}
        onBury={() => dispatch(actions.reviewCardHeld("buried", Date.now()))}
        onSuspend={() =>
          dispatch(actions.reviewCardHeld("suspended", Date.now()))
        }
        onDeleteFlashcard={() =>
          dispatch(actions.reviewFlashcardDeleteRequested())
        }
        onToggleIntervals={() =>
          dispatch(actions.preferenceToggled("showReviewIntervals"))
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
