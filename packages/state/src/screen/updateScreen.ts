import type { AppAction } from "../app/appAction.ts";
import type { Effect } from "../app/effect.ts";
import type { Feature, FeatureUpdate } from "../app/feature.ts";
import { mainScreenOf } from "../route/route.ts";
import { nextRoute } from "../route/updateRoute.ts";
import { updateMediaScreen } from "./mediaScreen/updateMediaScreen.ts";
import { isSameMainScreen } from "./openMediaScreen.ts";
import { updateProjectScreen } from "./projectScreen/updateProjectScreen.ts";
import type { MainScreenState, ScreenState } from "./screenState.ts";
import { initialMainScreen, initialScreen } from "./screenState.ts";
import { updateDialog } from "./updateDialog.ts";
import { updatePendingSubtitleFile } from "./updatePendingSubtitleFile.ts";
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
  return [
    {
      main: nextMain,
      settings: updateSettings(screen.settings, action, route),
      dialog,
    },
    [...mainEffects, ...dialogEffects],
  ];
};

export const screenFeature: Feature<ScreenState> = {
  initialState: initialScreen,
  update: updateScreen,
};

function updateMainScreen(
  main: MainScreenState,
  action: AppAction,
): readonly [MainScreenState, readonly Effect[]] {
  switch (main.kind) {
    case "media":
      return updateMediaScreen(main, action);
    case "project":
      return updateProjectScreen(main, action);
    case "offline":
      return updatePendingSubtitleFile(main, action);
    default:
      return [main, []];
  }
}
