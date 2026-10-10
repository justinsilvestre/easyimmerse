import type { AppAction } from "../app/appAction.ts";
import type { AppState } from "../app/appState.ts";
import type { Effect } from "../app/effect.ts";
import { selectIsRequestInFlight } from "../operations/operationsSelectors.ts";
import { mainScreenMoveOf } from "../route/mainScreenMoveOf.ts";
import { mainScreenOf } from "../route/route.ts";
import { isSettled } from "../server/isSettled.ts";
import {
  type FailedSave,
  failedSaveIdOf,
  openingIdPrefix,
  openingIds,
  openingProjectIdSuffix,
  selectFailedSave,
  selectFailedSaves,
} from "./failedSave.ts";
import type { FlashcardApp } from "./flashcardForm.ts";
import {
  flashcardNoticeKeys,
  flashcardNotices,
  show,
  withdraw,
  wordOf,
} from "./flashcardNotices.ts";

/** The end of one of the requests on the way to opening a failed save. */
export type OpeningSettled = {
  flashcardId: string;
  /** The id of the other request on the way to opening the same failed save. */
  otherId: string;
  /** Whether the request was aborted, as when the opening was given up, which needs no word. */
  isAborted: boolean;
  /** Tells whether the request brought what the opening needs: the project, or media files that include the failed save's file. */
  hasFound: (failedSave: FailedSave) => boolean;
};

/** How far the end of an opening request leaves the opening: failed, waiting for the other request, or ready for the form. */
export type OpeningProgress = "failed" | "waiting" | "ready";

/**
 * Asks for the project and its media files on the way to opening a failed save in its media file's form,
 * which takes it once both have come. A media file's form has at most one card on the way, so any other opening there is given up.
 */
export function openFailedSave(flashcardId: string, app: FlashcardApp) {
  const opening = selectFailedSave(app, flashcardId);
  if (opening?.mediaFileId == null) return [];
  const others = selectFailedSaves(app).filter(
    (other) =>
      other.isOpening &&
      other.mediaFileId === opening.mediaFileId &&
      failedSaveIdOf(other) !== flashcardId,
  );
  return [
    withdraw(flashcardNoticeKeys.saveRefused(flashcardId)),
    ...others.flatMap((other) => openingAborts(app, failedSaveIdOf(other))),
    ...openingRequests(flashcardId, opening.projectId),
  ];
}

/**
 * Says that a failed save could not be opened when its project or media files failed to load or lacked its media file,
 * and gives up the other request on the way. An opening given up, or one whose media file is no longer shown, needs no word.
 */
export function settleOpening(action: AppAction, app: FlashcardApp) {
  const opening = openingSettledBy(action);
  const failedSave = opening && selectFailedSave(app, opening.flashcardId);
  if (!opening || opening.isAborted || !failedSave?.isOpening) return [];
  if (failedSave.mediaFileId !== shownMediaFileId(mainScreenOf(app.route)))
    return [];
  if (openingProgress(opening, failedSave, app) !== "failed") return [];
  return [
    ...openingAborts(app, opening.flashcardId).filter(
      (abort) => abort.id === opening.otherId,
    ),
    show(flashcardNotices.openFailed(wordOf(failedSave.card))),
  ];
}

/** Gives up, without a word, the openings of failed saves on a media file that the route moves away from. */
export function giveUpOpeningsAway(action: AppAction, app: FlashcardApp) {
  const move = mainScreenMoveOf(app, action);
  if (move === null) return [];
  const shown = shownMediaFileId(move.to);
  if (shown === shownMediaFileId(move.from)) return [];
  return selectFailedSaves(app)
    .filter(({ isOpening, mediaFileId }) => isOpening && mediaFileId !== shown)
    .flatMap((failedSave) => openingAborts(app, failedSaveIdOf(failedSave)));
}

/** The end of an opening request that this action is, or null. */
export function openingSettledBy(action: AppAction): OpeningSettled | null {
  if (
    action.type !== "requestSettled" ||
    !action.id.startsWith(openingIdPrefix)
  )
    return null;
  const rest = action.id.slice(openingIdPrefix.length);
  if (
    rest.endsWith(openingProjectIdSuffix) &&
    isSettled(action, action.id, "getProject")
  ) {
    const flashcardId = rest.slice(0, -openingProjectIdSuffix.length);
    const isLoaded = action.outcome.ok;
    const otherId = openingIds(flashcardId).mediaFiles;
    const isAborted = isAbortedOutcome(action.outcome);
    return { flashcardId, otherId, isAborted, hasFound: () => isLoaded };
  }
  if (!isSettled(action, action.id, "listMediaFiles")) return null;
  const { outcome } = action;
  return {
    flashcardId: rest,
    otherId: openingIds(rest).project,
    isAborted: isAbortedOutcome(outcome),
    hasFound: ({ mediaFileId }) =>
      outcome.ok &&
      outcome.data.media_files.some(({ id }) => id === mediaFileId),
  };
}

/** How far an opening request's end leaves the opening of `failedSave`: the opening is ready once both requests have brought what it needs. */
export function openingProgress(
  opening: OpeningSettled,
  failedSave: FailedSave,
  app: Pick<AppState, "operations">,
): OpeningProgress {
  if (!opening.hasFound(failedSave)) return "failed";
  return selectIsRequestInFlight(app, opening.otherId) ? "waiting" : "ready";
}

function openingRequests(flashcardId: string, projectId: string) {
  const ids = openingIds(flashcardId);
  return [
    {
      type: "sendRequest",
      id: ids.mediaFiles,
      request: { kind: "listMediaFiles", projectId },
    },
    {
      type: "sendRequest",
      id: ids.project,
      request: { kind: "getProject", projectId },
    },
  ] satisfies Effect[];
}

/** Gives up the opening of a flashcard's failed save, aborting its requests under way. */
function openingAborts(app: Pick<AppState, "operations">, flashcardId: string) {
  return Object.values(openingIds(flashcardId))
    .filter((id) => selectIsRequestInFlight(app, id))
    .map((id) => ({ type: "abortRequest", id }) satisfies Effect);
}

function shownMediaFileId(
  route: ReturnType<typeof mainScreenOf>,
): string | null {
  return route.screen === "media" ? route.mediaFileId : null;
}

const isAbortedOutcome = (outcome: {
  ok: boolean;
  error?: { status: unknown };
}) => !outcome.ok && outcome.error?.status === "ABORTED";
