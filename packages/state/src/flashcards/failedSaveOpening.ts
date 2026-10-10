import type { AppAction } from "../app/appAction.ts";
import type { AppState } from "../app/appState.ts";
import { mainScreenOf } from "../route/route.ts";
import { routeAfter } from "../route/updateRoute.ts";
import { failedSaveIdOf, failedSavesOf, findFailedSave } from "./failedSave.ts";
import {
  openingAborts,
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

/**
 * Asks for the project and its media files on the way to opening a failed save in its media file's form,
 * which takes it once both have come. A media file's form has at most one card on the way, so any other opening there is given up.
 */
export function openFailedSave(flashcardId: string, app: AppState) {
  const opening = findFailedSave(app, flashcardId);
  if (opening?.mediaFileId == null) return [];
  const others = failedSavesOf(app.operations).filter(
    (other) =>
      other.isOpening &&
      other.mediaFileId === opening.mediaFileId &&
      failedSaveIdOf(other) !== flashcardId,
  );
  return [
    withdraw(flashcardNoticeKeys.saveRefused(flashcardId)),
    ...others.flatMap((other) =>
      openingAborts(app.operations, failedSaveIdOf(other)),
    ),
    ...openingRequests(flashcardId, opening.projectId),
  ];
}

/**
 * Says that a failed save could not be opened when its project or media files failed to load or lacked its media file,
 * and gives up the other request on the way. An opening given up, or one whose media file is no longer shown, needs no word.
 */
export function settleOpening(action: AppAction, app: AppState) {
  const opening = openingSettledBy(action);
  const failedSave = opening && findFailedSave(app, opening.flashcardId);
  if (!opening || opening.isAborted || !failedSave?.isOpening) return [];
  if (failedSave.mediaFileId !== shownMediaFileId(mainScreenOf(app.route)))
    return [];
  if (openingProgress(opening, failedSave, app) !== "failed") return [];
  return [
    ...openingAborts(app.operations, opening.flashcardId).filter(
      (abort) => abort.id === opening.otherId,
    ),
    show(flashcardNotices.openFailed(wordOf(failedSave.card))),
  ];
}

/** Gives up, without a word, the openings of failed saves on a media file that the route moves away from. */
export function giveUpOpeningsAway(action: AppAction, app: AppState) {
  const shownBefore = shownMediaFileId(mainScreenOf(app.route));
  const shown = shownMediaFileId(mainScreenOf(routeAfter(app, action)));
  if (shown === shownBefore) return [];
  return failedSavesOf(app.operations)
    .filter(({ isOpening, mediaFileId }) => isOpening && mediaFileId !== shown)
    .flatMap((failedSave) =>
      openingAborts(app.operations, failedSaveIdOf(failedSave)),
    );
}

function shownMediaFileId(
  route: ReturnType<typeof mainScreenOf>,
): string | null {
  return route.screen === "media" ? route.mediaFileId : null;
}
