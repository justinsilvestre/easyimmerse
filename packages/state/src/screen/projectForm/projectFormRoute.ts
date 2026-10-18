import type { MainRoute } from "../../route/route.ts";

/** The route of a screen that shows the project form: a new project's, or an existing project's settings. */
export type ProjectFormRoute = Extract<
  MainRoute,
  { screen: "newProject" | "projectSettings" }
>;

/** The id of the request that a project form's submission sends. */
export function projectFormRequestId(route: ProjectFormRoute): string {
  return route.screen === "newProject"
    ? "newProject/create"
    : `projectSettings/${route.projectId}/save`;
}
