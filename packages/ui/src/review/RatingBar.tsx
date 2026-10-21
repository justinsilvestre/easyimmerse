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
 * after, it offers the grades, each with the interval it would give the card while `intervals` are given.
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
  /** The time until the next review each grade would schedule, already written out, or null to leave them out. */
  intervals: Record<ReviewGrade, string> | null;
  onShowAnswer: () => void;
  onRate: (grade: ReviewGrade) => void;
}) {
  return (
    <div className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-3">
        {stage === "front" ? (
          <Button
            variant="primary"
            className="min-h-12 w-full sm:max-w-xs"
            aria-keyshortcuts="Space"
            onClick={onShowAnswer}
          >
            Show answer
            <KeyHint>Space</KeyHint>
          </Button>
        ) : (
          <div
            className={clsx(
              "grid w-full gap-2 sm:gap-3",
              buttons === "two" ? "grid-cols-2" : "grid-cols-4",
            )}
          >
            {gradeButtons[buttons].map((button) => (
              <GradeButtonView
                key={button.grade}
                button={button}
                interval={intervals?.[button.grade] ?? null}
                onRate={onRate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** A grade as a comfortable target: its name, its key where a keyboard is likely, and under them any interval it gives. */
function GradeButtonView({
  button,
  interval,
  onRate,
}: {
  button: GradeButton;
  interval: string | null;
  onRate: (grade: ReviewGrade) => void;
}) {
  return (
    <button
      type="button"
      aria-keyshortcuts={button.keyHint}
      onClick={() => onRate(button.grade)}
      className={clsx(
        "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1.5 text-sm font-semibold whitespace-nowrap transition-[background-color,transform] duration-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98]",
        gradeStyles[button.variant],
      )}
    >
      <span className="flex items-center gap-1.5">
        {button.label}
        <KeyHint>{button.keyHint}</KeyHint>
      </span>
      {interval !== null && (
        <span
          className={clsx(
            "text-xs font-normal tabular-nums",
            button.variant === "primary" ? "opacity-75" : "text-fg-muted",
          )}
        >
          {interval}
        </span>
      )}
    </button>
  );
}

/* The colours of `Button`'s variants of the same names; the grade for a forgotten card is set apart by its edge and name alone. */
const gradeStyles: Record<GradeButton["variant"], string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover",
  secondary:
    "border border-line-strong bg-surface text-fg hover:bg-surface-muted",
  danger:
    "border border-danger-line bg-surface text-danger-fg hover:bg-danger-soft",
};

/** Shows a button's key, only where a keyboard is likely, under a fine pointer such as a mouse. */
function KeyHint({ children }: { children: ReactNode }) {
  return (
    <span className="hidden pointer-fine:inline" aria-hidden>
      <Kbd>{children}</Kbd>
    </span>
  );
}
