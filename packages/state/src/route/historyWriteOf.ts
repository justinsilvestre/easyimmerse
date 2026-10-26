import type { AppAction } from "../app/appAction.ts";
import { projectOpenedByForm } from "../screen/projectForm/projectOpenedByForm.ts";
import type { Route } from "./route.ts";
import { mainScreenOf } from "./route.ts";
import type { LocationWrite } from "./routeEffect.ts";
import { pathOfRoute, routeOfPath } from "./routePath.ts";

/**
 * Returns how a move from one route to another, made by the action, writes the browser's history, or null when it writes nothing.
 * An ordinary move adds an entry, and so does each settings page opened, so that the browser's Back leaves one page at a time.
 * A redirect replaces the current entry: a project form opening its project, the open media file's removal, and the fallback from an unreachable screen.
 * An address the platform shows, at startup or after Back or Forward, writes nothing, unless it names no screen and the home screen replaces it.
 */
export function historyWriteOf(
  before: Route,
  after: Route,
  action: AppAction,
): LocationWrite | null {
  if (action.type === "locationOpened")
    return routeOfPath(action.path) === null ? "replace" : null;
  if (pathOfRoute(before) === pathOfRoute(after)) return null;
  return isRedirect(before, action) ? "replace" : "push";
}

function isRedirect(before: Route, action: AppAction): boolean {
  return (
    action.type === "routeUnreachable" ||
    projectOpenedByForm(mainScreenOf(before), action) !== null ||
    (action.type === "requestSettled" &&
      action.request.kind === "removeMediaFile")
  );
}
