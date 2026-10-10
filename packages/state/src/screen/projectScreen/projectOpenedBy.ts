import type { AppAction } from "../../app/appAction.ts";
import type { AppState } from "../../app/appState.ts";
import type { Effect } from "../../app/effect.ts";
import type { MainRoute } from "../../route/route.ts";
import { mainScreenOf } from "../../route/route.ts";
import { routeAfter } from "../../route/updateRoute.ts";

/**
 * Returns the project that the action's route change opens, or null when the same project stays open or none opens.
 * Moving between a project's overview and its media files keeps the project open; its settings do not.
 */
export function projectOpenedBy(
  app: AppState,
  action: AppAction,
): string | null {
  const before = projectShownOn(mainScreenOf(app.route));
  const after = projectShownOn(mainScreenOf(routeAfter(app, action)));
  return after !== null && after !== before ? after : null;
}

/** Records that a project was opened, which moves it to the front of the home screen. */
export function markOpened(projectId: string) {
  return {
    type: "sendRequest",
    id: `project/${projectId}/markOpened`,
    request: { kind: "markProjectOpened", projectId },
  } satisfies Effect;
}

function projectShownOn(route: MainRoute): string | null {
  return route.screen === "project" || route.screen === "media"
    ? route.projectId
    : null;
}
