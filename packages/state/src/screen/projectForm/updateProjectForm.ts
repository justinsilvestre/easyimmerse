import type { AppAction } from "../../app/appAction.ts";
import type { Effect } from "../../app/effect.ts";
import { isRequestInFlight } from "../../operations/isRequestInFlight.ts";
import type { OperationsState } from "../../operations/operations.ts";
import type { ServerRequest } from "../../server/serverRequest.ts";
import type { ProjectFormRoute } from "./projectFormRoute.ts";
import { projectFormRequestId } from "./projectFormRoute.ts";

/** Creates the project or saves its settings when the form is submitted, unless the last submission is still in flight. */
export function updateProjectForm(
  route: ProjectFormRoute,
  action: AppAction,
  operations: OperationsState,
) {
  if (action.type !== "projectFormSubmitted") return [];
  const id = projectFormRequestId(route);
  if (isRequestInFlight(operations, id)) return [];
  return [
    { type: "sendRequest", id, request: submission(route, action) },
  ] satisfies Effect[];
}

function submission(
  route: ProjectFormRoute,
  { settings }: Extract<AppAction, { type: "projectFormSubmitted" }>,
): ServerRequest {
  return route.screen === "newProject"
    ? { kind: "createProject", settings }
    : { kind: "updateProject", projectId: route.projectId, settings };
}
