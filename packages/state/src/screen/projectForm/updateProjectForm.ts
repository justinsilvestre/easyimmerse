import type { AppAction } from "../../app/appAction.ts";
import type { AppState } from "../../app/appState.ts";
import { updated } from "../../app/updated.ts";
import { selectIsRequestInFlight } from "../../operations/operationsSelectors.ts";
import type { ServerRequest } from "../../server/serverRequest.ts";
import type { MainScreenState } from "../screenState.ts";
import type { ProjectFormRoute } from "./projectFormRoute.ts";
import { projectFormRequestId } from "./projectFormRoute.ts";

/**
 * Creates the project or saves its settings when the form is submitted, unless the last submission is still in flight.
 * The form keeps no state of its own, so the main screen passes through as it is.
 */
export function updateProjectForm(
  main: MainScreenState,
  action: AppAction,
  route: ProjectFormRoute,
  app: Pick<AppState, "operations">,
) {
  if (action.type !== "projectFormSubmitted") return updated(main);
  const id = projectFormRequestId(route);
  if (selectIsRequestInFlight(app, id)) return updated(main);
  return updated(main, {
    type: "sendRequest",
    id,
    request: submission(route, action),
  });
}

function submission(
  route: ProjectFormRoute,
  { settings }: Extract<AppAction, { type: "projectFormSubmitted" }>,
): ServerRequest {
  return route.screen === "newProject"
    ? { kind: "createProject", settings }
    : { kind: "updateProject", projectId: route.projectId, settings };
}
