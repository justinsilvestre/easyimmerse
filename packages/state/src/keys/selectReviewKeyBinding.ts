import type { ReviewRating } from "@easyimmerse/types";
import type { AppState } from "../app/appState.ts";
import { reviewActions } from "../review/reviewActions.ts";
import { canUndo } from "../review/reviewSession.ts";
import { selectReviewScreen } from "../review/selectReviewSession.ts";
import { mainScreenOf } from "../route/route.ts";
import { routeActions } from "../route/routeActions.ts";
import {
  bindAction,
  bindCommand,
  isScreenCovered,
  type KeyPress,
  keyNameOf,
} from "./keyBinding.ts";

/** What the review screen completes with the time the key was pressed, which times how long the card was looked at. */
type ReviewKeyCommand =
  | { type: "showAnswer" }
  | { type: "rate"; rating: ReviewRating };

/** The rating each number key gives, in the order of the Forgot and Remembered buttons. */
const ratingKeys: Partial<Record<string, ReviewRating>> = {
  "1": "again",
  "2": "good",
};

/**
 * Returns what a key does on the review screen, or null to leave it to the browser.
 * Space or Enter shows the answer, and on the back rates the card Remembered; 1 and 2 rate it Forgot and Remembered on the back.
 * R replays the card's audio, Z or Ctrl+Z or Cmd+Z undoes the latest rating, and Escape goes back to the project.
 * Keys are left to a text field, an open menu, a dialog and Settings, and Space and Enter to a focused button.
 */
export function selectReviewKeyBinding(
  app: Pick<AppState, "route" | "screen">,
  press: KeyPress,
) {
  const session = selectReviewScreen(app);
  const main = mainScreenOf(app.route);
  if (session === null || main.screen !== "review") return null;
  if (isScreenCovered(app, press) || isTakenElsewhere(press)) return null;
  const key = keyNameOf(press);
  if (key === "Escape")
    return bindAction(
      routeActions.navigated({
        type: "openProject",
        projectId: main.projectId,
      }),
    );
  if (key === "z")
    return canUndo(session)
      ? bindAction(reviewActions.reviewUndoRequested())
      : null;
  if (press.hasCommandKey || session.shown === null) return null;
  if (key === "r") return bindAction(reviewActions.reviewAudioReplayed());
  if (key === " " || key === "Enter")
    return press.focus === "control" ? null : answerBinding(session.stage);
  const rating = ratingKeys[key];
  return session.stage === "back" && rating
    ? bindCommand<ReviewKeyCommand>({ type: "rate", rating })
    : null;
}

function isTakenElsewhere(press: KeyPress): boolean {
  return (
    press.isHandled ||
    press.hasAltKey ||
    press.isShifted ||
    press.focus === "formField" ||
    press.focus === "menu"
  );
}

function answerBinding(stage: "front" | "back") {
  return bindCommand<ReviewKeyCommand>(
    stage === "front"
      ? { type: "showAnswer" }
      : { type: "rate", rating: "good" },
  );
}
