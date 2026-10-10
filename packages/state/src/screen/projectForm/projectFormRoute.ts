import type { MainRoute } from "../../route/route.ts";

/** The route of a screen that shows the project form. */
export type ProjectFormRoute = Extract<MainRoute, { screen: "newProject" }>;

/** The id of the request that a project form's submission sends. */
export function projectFormRequestId(_route: ProjectFormRoute): string {
  return "newProject/create";
}
