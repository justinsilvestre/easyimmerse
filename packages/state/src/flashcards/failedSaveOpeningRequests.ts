import type { AppAction } from "../app/appAction.ts";
import type { AppState } from "../app/appState.ts";
import type { Effect } from "../app/effect.ts";
import { isRequestInFlight } from "../operations/isRequestInFlight.ts";
import { isSettled } from "../server/isSettled.ts";
import type { FailedSave } from "./failedSave.ts";

const openingPrefix = "flashcards/opening/";
const projectSuffix = "/project";

const openingIds = (flashcardId: string) => ({
  mediaFiles: `${openingPrefix}${flashcardId}`,
  project: `${openingPrefix}${flashcardId}${projectSuffix}`,
});

/** The end of one of the requests on the way to opening a failed save. */
export type OpeningSettled = {
  flashcardId: string;
  /** The id of the other request on the way to opening the same failed save. */
  otherId: string;
  /** Tells whether the request brought what the opening needs: the project, or media files that include the failed save's file. */
  hasFound: (failedSave: FailedSave) => boolean;
};

/** How far the end of an opening request leaves the opening: failed, waiting for the other request, or ready for the form. */
export type OpeningProgress = "failed" | "waiting" | "ready";

/** Asks for the project and its media files on the way to opening a failed save, so that its media screen can show the form. */
export function openingRequests(
  flashcardId: string,
  projectId: string,
): readonly Effect[] {
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
  ];
}

/** The end of an opening request that this action is, or null. */
export function openingSettledBy(action: AppAction): OpeningSettled | null {
  if (action.type !== "requestSettled" || !action.id.startsWith(openingPrefix))
    return null;
  const rest = action.id.slice(openingPrefix.length);
  if (
    rest.endsWith(projectSuffix) &&
    isSettled(action, action.id, "getProject")
  ) {
    const flashcardId = rest.slice(0, -projectSuffix.length);
    const isLoaded = action.outcome.ok;
    const otherId = openingIds(flashcardId).mediaFiles;
    return { flashcardId, otherId, hasFound: () => isLoaded };
  }
  if (!isSettled(action, action.id, "listMediaFiles")) return null;
  const { outcome } = action;
  return {
    flashcardId: rest,
    otherId: openingIds(rest).project,
    hasFound: ({ mediaFileId }) =>
      outcome.ok &&
      outcome.data.media_files.some(({ id }) => id === mediaFileId),
  };
}

/** How far an opening request's end leaves the opening of `failedSave`: the opening is ready once both requests have brought what it needs. */
export function openingProgress(
  opening: OpeningSettled,
  failedSave: FailedSave,
  app: AppState,
): OpeningProgress {
  if (!opening.hasFound(failedSave)) return "failed";
  return isRequestInFlight(app.operations, opening.otherId)
    ? "waiting"
    : "ready";
}
