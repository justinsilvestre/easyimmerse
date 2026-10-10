import type { RootState } from "../app/createAppStore.ts";
import { mainScreenOf } from "./route.ts";

/** Returns where the app is. */
export const selectRoute = (state: RootState) => state.app.route;

/** Tells whether Settings lie over the main screen. */
export const selectIsSettingsOpen = (state: RootState) =>
  state.app.route.screen === "settings";

/** Returns the id of the media file open on the main screen, or null. */
export const selectCurrentMediaFileId = (state: RootState) => {
  const main = mainScreenOf(state.app.route);
  return main.screen === "media" ? main.mediaFileId : null;
};
