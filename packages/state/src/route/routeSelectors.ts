import type { AppRoot } from "../app/createAppStore.ts";
import { mainScreenOf, type NavigationStep, navigate } from "./route.ts";
import { pathOfRoute } from "./routePath.ts";

/** Returns where the app is. */
export const selectRoute = (state: AppRoot) => state.app.route;

/** Tells whether Settings lie over the main screen. */
export const selectIsSettingsOpen = (state: AppRoot) =>
  state.app.route.screen === "settings";

/** Returns the id of the media file open on the main screen, or null. */
export const selectCurrentMediaFileId = (state: AppRoot) => {
  const main = mainScreenOf(state.app.route);
  return main.screen === "media" ? main.mediaFileId : null;
};

/** Returns the section of the general settings to bring into view, or null when Settings were not opened for one. */
export const selectSettingsScrollTarget = (state: AppRoot) =>
  state.app.route.screen === "settings"
    ? (state.app.route.scrollTarget ?? null)
    : null;

/** Returns the path of the place a step leads from where the app is, for a link that takes the step. */
export const selectPathOfStep = (state: AppRoot, step: NavigationStep) =>
  pathOfRoute(navigate(state.app.route, step));
