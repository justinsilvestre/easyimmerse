import type { AppAction } from "../../app/appAction.ts";
import type { MainRoute } from "../../route/route.ts";
import { isSettled } from "../../server/isSettled.ts";
import { projectFormRequestId } from "./projectFormRoute.ts";

/** Returns the project that a settled submission opens while its form is still the main screen: the one created. */
export function projectOpenedByForm(
  route: MainRoute,
  action: AppAction,
): string | null {
  if (route.screen !== "newProject") return null;
  if (!isSettled(action, projectFormRequestId(route), "createProject"))
    return null;
  return action.outcome.ok ? action.outcome.data.id : null;
}
