import type { AppAction } from "../app/appAction.ts";
import type { Effect } from "../app/effect.ts";
import type { Feature, FeatureUpdate } from "../app/feature.ts";
import { isSameMainScreen, mainScreenOf } from "../route/route.ts";
import { nextRoute } from "../route/updateRoute.ts";
import { updateMediaScreen } from "./mediaScreen/updateMediaScreen.ts";
import { updateOfflineScreen } from "./offlineScreen/updateOfflineScreen.ts";
import { updateProjectScreen } from "./projectScreen/updateProjectScreen.ts";
import type { MainScreenState, ScreenState } from "./screenState.ts";
import { initialMainScreen, initialScreen } from "./screenState.ts";
import { updateDialog } from "./updateDialog.ts";
import { updateSettings } from "./updateSettings.ts";

/** Updates the screens, starting the main screen over whenever the route moves to a different one. */
export const updateScreen: FeatureUpdate<ScreenState> = (
  screen,
  action,
  app,
) => {
  const route = nextRoute(app.route, action);
  const main = isSameMainScreen(app.route, route)
    ? screen.main
    : initialMainScreen(mainScreenOf(route));
  const [nextMain, mainEffects] = updateMainScreen(main, action);
  const [dialog, dialogEffects] = updateDialog(screen.dialog, action);
  const settings = updateSettings(screen.settings, action, route);
  const effects = [...mainEffects, ...dialogEffects, ...failureNotices(action)];
  return nextMain === screen.main &&
    settings === screen.settings &&
    dialog === screen.dialog
    ? [screen, effects]
    : [{ main: nextMain, settings, dialog }, effects];
};

/** The screens as a feature: the state of the main screen, of Settings and of the open dialog. */
export const screenFeature: Feature<ScreenState> = {
  initialState: initialScreen,
  update: updateScreen,
};

/** Tells the user that adding a picked file failed, even when its screen has gone by the time the failure arrives. */
function failureNotices(action: AppAction): Effect[] {
  switch (action.type) {
    case "mediaFileAddFailed":
      return [notice("The media file could not be added")];
    case "subtitleFileAddFailed":
      return [notice("The subtitles file could not be added")];
    default:
      return [];
  }
}

function notice(message: string): Effect {
  return { type: "showNotification", message };
}

function updateMainScreen(
  main: MainScreenState,
  action: AppAction,
): readonly [MainScreenState, readonly Effect[]] {
  switch (main.kind) {
    case "media":
      return updateMediaScreen(main, action);
    case "project":
      return [updateProjectScreen(main, action), []];
    case "offline":
      return updateOfflineScreen(main, action);
    default:
      return [main, []];
  }
}
