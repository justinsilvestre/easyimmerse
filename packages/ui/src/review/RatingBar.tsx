import clsx from "clsx";
import type { ReactNode } from "react";
import { Button } from "../components/Button.tsx";
import { Kbd } from "../components/Kbd.tsx";

/** How well the user remembered a card, as Anki's four answer buttons put it. */
export type ReviewGrade = "again" | "hard" | "good" | "easy";

/** Whether the user grades with Forgot and Remembered, or with Anki's four buttons. */
export type ReviewButtons = "two" | "four";

type GradeButton = {
  grade: ReviewGrade;
  label: string;
  keyHint: string;
  variant: "primary" | "secondary" | "danger";
};

const gradeButtons: Record<ReviewButtons, readonly GradeButton[]> = {
  two: [
    { grade: "again", label: "Forgot", keyHint: "1", variant: "danger" },
    { grade: "good", label: "Remembered", keyHint: "2", variant: "primary" },
  ],
  four: [
    { grade: "again", label: "Again", keyHint: "1", variant: "danger" },
    { grade: "hard", label: "Hard", keyHint: "2", variant: "secondary" },
    { grade: "good", label: "Good", keyHint: "3", variant: "primary" },
    { grade: "easy", label: "Easy", keyHint: "4", variant: "secondary" },
  ],
};

/**
 * The bar of controls under the card on the review screen. Before the answer is shown, it offers to show it;
 * after, it offers the grades, each with the interval it would give the card.
 */
export function RatingBar({
  stage,
  buttons,
  intervals,
  onShowAnswer,
  onRate,
}: {
  stage: "front" | "back";
  buttons: ReviewButtons;
  /** The time until the next review each grade would schedule, already written out. */
  intervals: Record<ReviewGrade, string>;
  onShowAnswer: () => void;
  onRate: (grade: ReviewGrade) => void;
}) {
  return (
    <div className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-xl flex-col items-center gap-1 px-4 py-2">
        {stage === "front" ? (
          <Button
            variant="primary"
            className="min-h-11 w-full sm:max-w-xs"
            aria-keyshortcuts="Space"
            onClick={onShowAnswer}
          >
            Show answer
            <KeyHint>Space</KeyHint>
          </Button>
        ) : (
          <div
            className={clsx(
              "grid w-full gap-2",
              buttons === "two" ? "grid-cols-2" : "grid-cols-4",
            )}
          >
            {gradeButtons[buttons].map((button) => (
              <Button
                key={button.grade}
                variant={button.variant}
                className="min-h-11 flex-col gap-0 px-1 py-1"
                aria-keyshortcuts={button.keyHint}
                onClick={() => onRate(button.grade)}
              >
                <span className="flex items-center gap-1.5">
                  {button.label}
                  <KeyHint>{button.keyHint}</KeyHint>
                </span>
                <span className="text-xs font-normal opacity-80">
                  {intervals[button.grade]}
                </span>
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Shows a button's key, only where a keyboard is likely, under a fine pointer such as a mouse. */
function KeyHint({ children }: { children: ReactNode }) {
  return (
    <span className="hidden pointer-fine:inline" aria-hidden>
      <Kbd>{children}</Kbd>
    </span>
  );
}
