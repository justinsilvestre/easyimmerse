import type { AppAction } from "../../app/appAction.ts";
import type { MainRoute } from "../../route/route.ts";
import { isSettled } from "../../server/isSettled.ts";
import { projectFormRequestId } from "./projectFormRoute.ts";

/**
 * Returns the project that a settled submission opens while its form is still the main screen:
 * the one created, or the one whose settings were saved.
 */
export function projectOpenedByForm(
  route: MainRoute,
  action: AppAction,
): string | null {
  if (route.screen === "newProject")
    return isSettled(action, projectFormRequestId(route), "createProject") &&
      action.outcome.ok
      ? action.outcome.data.id
      : null;
  if (route.screen === "projectSettings")
    return isSettled(action, projectFormRequestId(route), "updateProject") &&
      action.outcome.ok
      ? route.projectId
      : null;
  return null;
}
