import type { AppAction } from "../../app/appAction.ts";
import { actions } from "../../app/appAction.ts";
import { stateAfter } from "../../app/stateAfter.ts";
import type { MediaScreenState } from "../screenState.ts";
import { updateMediaScreen } from "./updateMediaScreen.ts";

/** The route of m1's media screen in project p1. */
export const mediaRoute = {
  screen: "media",
  projectId: "p1",
  mediaFileId: "m1",
} as const;

/** The app, and m1's media screen in it, after the given actions. */
export function mediaScreenAfter(...before: AppAction[]) {
  const app = stateAfter(actions.openMediaFileRequested("p1", "m1"), ...before);
  return { app, screen: app.screen.main as MediaScreenState };
}

/** Applies an action to m1's media screen after the given earlier actions. */
export function applyToMediaScreen(action: AppAction, ...before: AppAction[]) {
  const { app, screen } = mediaScreenAfter(...before);
  return updateMediaScreen(screen, action, app, mediaRoute);
}

/** Applies an action to a media screen from `mediaScreenAfter`, for tests that compare the result with that screen. */
export function applyToMediaScreenIn(
  { app, screen }: ReturnType<typeof mediaScreenAfter>,
  action: AppAction,
) {
  return updateMediaScreen(screen, action, app, mediaRoute);
}
