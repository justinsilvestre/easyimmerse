import type { AppAction } from "../../app/appAction.ts";
import type { Effect } from "../../app/effect.ts";
import { mainScreenMoveOf } from "../../route/mainScreenMoveOf.ts";
import type { MainRoute } from "../../route/route.ts";
import type { RouteApp } from "../../route/updateRoute.ts";

/**
 * Returns the project that the action's route change opens, or null when the same project stays open or none opens.
 * Moving between a project's overview and its media files keeps the project open; its settings do not.
 */
export function projectOpenedBy(
  app: RouteApp,
  action: AppAction,
): string | null {
  const move = mainScreenMoveOf(app, action);
  if (move === null) return null;
  const opened = projectShownOn(move.to);
  return opened !== null && opened !== projectShownOn(move.from)
    ? opened
    : null;
}

/** Records that the project the action's route change opens was opened, which moves it to the front of the home screen. */
export function markOpenedBy(app: RouteApp, action: AppAction) {
  const projectId = projectOpenedBy(app, action);
  if (projectId === null) return [];
  return [
    {
      type: "sendRequest",
      id: `project/${projectId}/markOpened`,
      request: { kind: "markProjectOpened", projectId },
    } satisfies Effect,
  ];
}

function projectShownOn(route: MainRoute): string | null {
  return route.screen === "project" || route.screen === "media"
    ? route.projectId
    : null;
}
