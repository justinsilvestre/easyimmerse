import type { AppAction } from "../app/appAction.ts";
import { mainScreenOf } from "../route/route.ts";
import { routeAfter } from "../route/updateRoute.ts";
import type { FailedSave } from "./failedSave.ts";
import { changeFailedSave, findFailedSave } from "./failedSaveListing.ts";
import {
  openingProgress,
  openingRequests,
  openingSettledBy,
} from "./failedSaveOpeningRequests.ts";
import {
  flashcardNoticeKeys,
  flashcardNotices,
  show,
  withdraw,
  wordOf,
} from "./flashcardNotices.ts";
import type { FlashcardsContext } from "./flashcardsContext.ts";
import type { FlashcardsState } from "./flashcardsState.ts";

/**
 * Marks a failed save to be opened in its media file's form, which takes it once that screen has the file,
 * and asks for the project and its media files on the way. A media file's form has at most one card waiting to open.
 */
export function openFailedSave(
  state: FlashcardsState,
  flashcardId: string,
  { outbox }: FlashcardsContext,
): FlashcardsState {
  const opening = findFailedSave(state, flashcardId);
  if (opening?.mediaFileId == null) return state;
  outbox.add(
    withdraw(flashcardNoticeKeys.saveRefused(flashcardId)),
    ...openingRequests(flashcardId, opening.projectId),
  );
  const failedSaves = state.failedSaves.map((other) =>
    other.mediaFileId === opening.mediaFileId
      ? { ...other, isOpening: other === opening }
      : other,
  );
  return { ...state, failedSaves };
}

/** Clears the mark of a failed save whose project or media files failed to load or lacked its media file, and says it could not be opened. */
export function settleOpening(
  state: FlashcardsState,
  action: AppAction,
  { app, outbox }: FlashcardsContext,
): FlashcardsState {
  const opening = openingSettledBy(action);
  const failedSave = opening && findFailedSave(state, opening.flashcardId);
  if (!opening || !failedSave?.isOpening) return state;
  if (openingProgress(opening, failedSave, app) !== "failed") return state;
  outbox.add(show(flashcardNotices.openFailed(wordOf(failedSave.card))));
  return changeFailedSave(state, { ...failedSave, isOpening: false });
}

/** Clears, without a word, the marks of failed saves waiting to open on a media file the route moves away from. */
export function clearOpeningsAway(
  state: FlashcardsState,
  action: AppAction,
  context: FlashcardsContext,
): FlashcardsState {
  const route = mainScreenOf(routeAfter(context.app, action));
  const shown = route.screen === "media" ? route.mediaFileId : null;
  const isAway = (failedSave: FailedSave) =>
    failedSave.isOpening && failedSave.mediaFileId !== shown;
  if (!state.failedSaves.some(isAway)) return state;
  const failedSaves = state.failedSaves.map((failedSave) =>
    isAway(failedSave) ? { ...failedSave, isOpening: false } : failedSave,
  );
  return { ...state, failedSaves };
}
