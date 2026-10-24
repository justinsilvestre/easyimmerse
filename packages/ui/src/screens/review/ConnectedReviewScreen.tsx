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
import type { Flashcard, ReviewIntervals } from "@easyimmerse/types";
import { FlashcardDeleteDialog } from "../../components/flashcards/FlashcardDeleteDialog.tsx";
import { useKeyBindings } from "../../lib/useKeyBindings.ts";
import { useAppDispatch } from "../../useAppDispatch.ts";
import { useAppSelector } from "../../useAppSelector.ts";
import { formatInterval } from "./formatInterval.ts";
import type { ReviewGrade } from "./RatingBar.tsx";
import { ReviewScreen } from "./ReviewScreen.tsx";
import { useReviewCardView } from "./useReviewCardView.ts";

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
  const mediaFileId = editableMediaFileIdOf(shown?.flashcard);
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

/** The media file to open the flashcard's editor on, or null for a card the editor cannot open: one made from the library, or one whose media file is gone. */
function editableMediaFileIdOf(flashcard: Flashcard | undefined) {
  if (!flashcard || flashcard.is_from_library) return null;
  return flashcard.media_file_id;
}
