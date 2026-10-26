import type { AppAction } from "../app/appAction.ts";
import { projectOpenedByForm } from "../screen/projectForm/projectOpenedByForm.ts";
import type { Route } from "./route.ts";
import { mainScreenOf } from "./route.ts";
import type { LocationWrite } from "./routeEffect.ts";
import { pathOfRoute, routeOfPath } from "./routePath.ts";
import { upRouteOf } from "./upRouteOf.ts";

/** How a move writes the browser's history: a new entry, the current entry replaced, or a return to the previous entry. */
export type HistoryWrite = LocationWrite | "back";

/**
 * Returns how a move from one route to another, made by the action, writes the browser's history, or null when it writes nothing.
 * `previousPath` is the path of the history entry before the current one, or null when the app does not know it.
 * - An ordinary move adds an entry, and so does each settings page opened, so that the browser's Back leaves one page at a time.
 * - An Up step, a move to the screen the current one belongs to, returns to the previous entry when that entry is its target,
 *   and replaces the current entry otherwise, so that the history never holds the screen just left after its target.
 *   The app's own Back controls take such steps, and so do a saved project settings form and the open media file's removal.
 * - Any other redirect replaces the current entry: the new project form opening its project, and the fallback from an unreachable screen.
 * - An address the platform shows, at startup or after Back or Forward, writes nothing, unless it names no screen and the home screen replaces it.
 */
export function historyWriteOf(
  before: Route,
  after: Route,
  action: AppAction,
  previousPath: string | null,
): HistoryWrite | null {
  if (action.type === "locationOpened")
    return routeOfPath(action.path) === null ? "replace" : null;
  if (before === after) return null;
  const path = pathOfRoute(after);
  if (pathOfRoute(before) === path) return null;
  if (isUpStep(before, path, action))
    return previousPath === path ? "back" : "replace";
  return isRedirect(before, action) ? "replace" : "push";
}

/** Tells whether the move leads to the screen the current one belongs to, by the app's own Back controls or by a redirect such as a saved form, rather than by a link. */
function isUpStep(before: Route, path: string, action: AppAction): boolean {
  const up = upRouteOf(before);
  return (
    action.type !== "linkOpened" && up !== null && pathOfRoute(up) === path
  );
}

function isRedirect(before: Route, action: AppAction): boolean {
  return (
    action.type === "routeUnreachable" ||
    projectOpenedByForm(mainScreenOf(before), action) !== null ||
    (action.type === "requestSettled" &&
      action.request.kind === "removeMediaFile")
  );
}
