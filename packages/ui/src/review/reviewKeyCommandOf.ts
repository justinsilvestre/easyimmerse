import type { KeyPress } from "@easyimmerse/state";
import type { ReviewButtons, ReviewGrade } from "./RatingBar.tsx";

/** What a key on the review screen asks for. */
export type ReviewKeyCommand =
  | { type: "showAnswer" }
  | { type: "rate"; grade: ReviewGrade }
  | { type: "replayAudio" }
  | { type: "undo" }
  | { type: "back" };

/** What the review screen shows, as far as its keys depend on it. */
type ReviewKeyContext = {
  stage: "front" | "back";
  buttons: ReviewButtons;
  hasCard: boolean;
  canUndo: boolean;
};

/** The grade each number key gives, by the buttons shown, as the order of the buttons numbers them. */
const gradeKeys: Record<ReviewButtons, Record<string, ReviewGrade>> = {
  two: { "1": "again", "2": "good" },
  four: { "1": "again", "2": "hard", "3": "good", "4": "easy" },
};

/**
 * Tells what a key press means on the review screen, or null when it means nothing there.
 * Keys mean nothing while a text field, a menu or a dialog takes them, and Space and Enter are left to a focused button.
 */
export function reviewKeyCommandOf(
  press: KeyPress,
  context: ReviewKeyContext,
): ReviewKeyCommand | null {
  if (isTakenElsewhere(press)) return null;
  const key = press.key.toLowerCase();
  if (key === "escape") return { type: "back" };
  if (key === "z") return context.canUndo ? { type: "undo" } : null;
  if (press.hasCommandKey || !context.hasCard) return null;
  if (key === "r") return { type: "replayAudio" };
  if (key === " " || key === "enter") return answerCommand(press, context);
  const grade = gradeKeys[context.buttons][key];
  return context.stage === "back" && grade ? { type: "rate", grade } : null;
}

function isTakenElsewhere(press: KeyPress): boolean {
  return (
    press.isHandled ||
    press.isDialogOpen ||
    press.hasAltKey ||
    press.isShifted ||
    press.focus === "formField" ||
    press.focus === "menu"
  );
}

function answerCommand(
  press: KeyPress,
  { stage }: ReviewKeyContext,
): ReviewKeyCommand | null {
  if (press.focus === "control") return null;
  return stage === "front"
    ? { type: "showAnswer" }
    : { type: "rate", grade: "good" };
}
