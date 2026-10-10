import type { AppAction } from "../../app/appAction.ts";
import type { Effect } from "../../app/effect.ts";
import { isRequestInFlight } from "../../operations/isRequestInFlight.ts";
import type { OperationsState } from "../../operations/operations.ts";
import type { ProjectFormRoute } from "./projectFormRoute.ts";
import { projectFormRequestId } from "./projectFormRoute.ts";

/** Creates the project when the form is submitted, unless the last submission is still in flight. */
export function updateProjectForm(
  route: ProjectFormRoute,
  action: AppAction,
  operations: OperationsState,
): readonly Effect[] {
  if (action.type !== "projectFormSubmitted") return [];
  const id = projectFormRequestId(route);
  if (isRequestInFlight(operations, id)) return [];
  return [
    {
      type: "sendRequest",
      id,
      request: { kind: "createProject", settings: action.settings },
    },
  ];
}
