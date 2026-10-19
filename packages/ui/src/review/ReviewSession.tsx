import type { FlashcardFieldKey } from "@easyimmerse/types";
import { useEffect, useEffectEvent } from "react";
import type { FlashcardLanguages } from "../flashcards/flashcardFields.ts";
import { keyPressOf } from "../hooks/keyPressOf.ts";
import type { ReviewButtons, ReviewGrade } from "./RatingBar.tsx";
import { ReviewCard, type ReviewCardView } from "./ReviewCard.tsx";
import { ReviewDone, type ReviewEnd } from "./ReviewDone.tsx";
import {
  type ReviewKeyCommand,
  reviewKeyCommandOf,
} from "./reviewKeyCommandOf.ts";

/**
 * The body of the review screen: the card being reviewed, near the top so that it stays in place when its back appears,
 * or how the session ended.
 * It answers the screen's keys: Space or Enter shows the answer and then rates the card as remembered,
 * the number keys rate it, R replays its audio, Z undoes the last rating, and Escape goes back to the project.
 * The screen places the `ReviewControlRow` above it and the `RatingBar` below it.
 */
export function ReviewSession({
  card,
  stage,
  buttons,
  end,
  canUndo,
  includedFields,
  frontFields,
  languages,
  onShowAnswer,
  onRate,
  onReplayAudio,
  onUndo,
  onBack,
  onLearnMore,
}: {
  card: ReviewCardView | null;
  stage: "front" | "back";
  buttons: ReviewButtons;
  /** Why there is no card to show, while there is none. */
  end: ReviewEnd | null;
  canUndo: boolean;
  includedFields: readonly FlashcardFieldKey[];
  frontFields: readonly FlashcardFieldKey[];
  languages: FlashcardLanguages;
  onShowAnswer: () => void;
  onRate: (grade: ReviewGrade) => void;
  onReplayAudio: () => void;
  onUndo: () => void;
  onBack: () => void;
  onLearnMore: () => void;
}) {
  const run = (command: ReviewKeyCommand) => {
    if (command.type === "showAnswer") onShowAnswer();
    else if (command.type === "rate") onRate(command.grade);
    else if (command.type === "replayAudio") onReplayAudio();
    else if (command.type === "undo") onUndo();
    else onBack();
  };
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const context = { stage, buttons, hasCard: card !== null, canUndo };
    const command = reviewKeyCommandOf(keyPressOf(event), context);
    if (command === null) return;
    event.preventDefault();
    run(command);
  });
  useEffect(() => {
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);
  if (card === null)
    return (
      end && <ReviewDone end={end} onBack={onBack} onLearnMore={onLearnMore} />
    );
  return (
    <div className="flex flex-col px-4 pt-6 pb-6">
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
      />
    </div>
  );
}
