import type { ReviewEnd } from "@easyimmerse/state";
import type { FlashcardFieldKey } from "@easyimmerse/types";
import type { FlashcardLanguages } from "../flashcards/flashcardFields.ts";
import { LeechNotice } from "./LeechNotice.tsx";
import { ReviewCard, type ReviewCardView } from "./ReviewCard.tsx";
import { ReviewDone } from "./ReviewDone.tsx";
import { ScreenshotDialog } from "./ScreenshotDialog.tsx";

/**
 * The body of the review screen: the card being reviewed, near the top so that it stays in place when its back appears,
 * or how the session ended. The card's audio plays by itself as the side holding it is shown,
 * and again from its start whenever `audioPlayKey` changes.
 * A leech is flagged above the card, with the ways to deal with it, and the card's screenshot opens at full size when tapped.
 * The screen places the `ReviewControlRow` above it and the `RatingBar` below it.
 */
export function ReviewSession({
  card,
  leechLapseCount,
  isScreenshotExpanded,
  stage,
  end,
  includedFields,
  frontFields,
  languages,
  audioPlayKey,
  onReplayAudio,
  onExpandScreenshot,
  onCloseScreenshot,
  onEditFlashcard,
  onSuspend,
  onBack,
  onLearnMore,
  onReviewMore,
  onRetry,
}: {
  card: ReviewCardView | null;
  /** How often the user has forgotten the card, when that is so often that it may need rewording or suspending; otherwise null. */
  leechLapseCount: number | null;
  isScreenshotExpanded: boolean;
  stage: "front" | "back";
  /** Why there is no card to show, while there is none. */
  end: ReviewEnd | null;
  includedFields: readonly FlashcardFieldKey[];
  frontFields: readonly FlashcardFieldKey[];
  languages: FlashcardLanguages;
  /** Changes whenever the card's audio is to play again from its start, as for another card or a replay. */
  audioPlayKey: string;
  onReplayAudio: () => void;
  onExpandScreenshot: () => void;
  onCloseScreenshot: () => void;
  /** Opens the card in the editor. Null when it cannot be edited from here. */
  onEditFlashcard: (() => void) | null;
  onSuspend: () => void;
  onBack: () => void;
  onLearnMore: () => void;
  onReviewMore: (reviewCount: number) => void;
  onRetry: () => void;
}) {
  if (card === null)
    return (
      end && (
        <ReviewDone
          end={end}
          onBack={onBack}
          onLearnMore={onLearnMore}
          onReviewMore={onReviewMore}
          onRetry={onRetry}
        />
      )
    );
  const isAudioHeard =
    card.audioUrl !== null &&
    !card.isMediaUnavailable &&
    includedFields.includes("audio_context") &&
    (stage === "back" || frontFields.includes("audio_context"));
  return (
    <div className="flex flex-col gap-3 px-4 pt-4 pb-10 sm:pt-8">
      {leechLapseCount !== null && (
        <LeechNotice
          lapseCount={leechLapseCount}
          onEdit={onEditFlashcard}
          onSuspend={onSuspend}
        />
      )}
      <ReviewCard
        key={card.flashcardId}
        content={card.content}
        includedFields={includedFields}
        frontFields={frontFields}
        languages={languages}
        screenshotUrl={card.screenshotUrl}
        isRevealed={stage === "back"}
        isMediaUnavailable={card.isMediaUnavailable}
        onPlayAudio={onReplayAudio}
        onExpandScreenshot={onExpandScreenshot}
      />
      {isScreenshotExpanded && card.screenshotUrl !== null && (
        <ScreenshotDialog
          url={card.screenshotUrl}
          onClose={onCloseScreenshot}
        />
      )}
      {/* Mounted as the side holding the audio is shown, so that it plays once per card, and mounted anew for each replay. */}
      {isAudioHeard && (
        // biome-ignore lint/a11y/useMediaCaption: the clip speaks the sentence the card was made from, which has no captions of its own to give.
        <audio key={audioPlayKey} src={card.audioUrl ?? undefined} autoPlay />
      )}
    </div>
  );
}
