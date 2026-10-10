import type { AppAction } from "../app/appAction.ts";
import type { AppState } from "../app/appState.ts";
import type { Effect } from "../app/effect.ts";
import type { Feature, FeatureUpdate } from "../app/feature.ts";
import type { MainRoute } from "../route/route.ts";
import { isSameMainScreen, mainScreenOf } from "../route/route.ts";
import { routeAfter } from "../route/updateRoute.ts";
import { updateMediaScreen } from "./mediaScreen/updateMediaScreen.ts";
import { leaveWaveform } from "./mediaScreen/updateWaveform.ts";
import { updateOfflineScreen } from "./offlineScreen/updateOfflineScreen.ts";
import { endImport } from "./projectScreen/mediaImportRequests.ts";
import {
  markOpened,
  projectOpenedBy,
} from "./projectScreen/projectOpenedBy.ts";
import { updateProjectScreen } from "./projectScreen/updateProjectScreen.ts";
import type { MainScreenState, ScreenState } from "./screenState.ts";
import { initialMainScreen, initialScreen } from "./screenState.ts";
import { updateDialog } from "./updateDialog.ts";
import { updateSettings } from "./updateSettings.ts";

/**
 * Updates the screens. The main screen sees every action first, the one that leaves it included,
 * and starts over whenever the route moves to a different main screen. Opening a project records that it was opened.
 */
export const updateScreen: FeatureUpdate<ScreenState> = (
  screen,
  action,
  app,
) => {
  const [updated, mainEffects] = updateMainScreen(
    screen.main,
    action,
    mainScreenOf(app.route),
    app,
  );
  const route = routeAfter(app, action);
  const isLeaving = !isSameMainScreen(app.route, route);
  const nextMain = isLeaving
    ? initialMainScreen(mainScreenOf(route), app.storedPlaces)
    : updated;
  const [dialog, dialogEffects] = updateDialog(screen.dialog, action);
  const [settings, settingsEffects] = updateSettings(
    screen.settings,
    action,
    route,
  );
  const opened = projectOpenedBy(app, action);
  const effects = [
    ...mainEffects,
    ...(isLeaving ? leavingEffects(updated, mainScreenOf(app.route)) : []),
    ...dialogEffects,
    ...settingsEffects,
    ...failureNotices(action),
    ...(opened === null ? [] : [markOpened(opened)]),
  ];
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

/** Stops the work that belongs to a main screen being replaced. */
function leavingEffects(main: MainScreenState, route: MainRoute): Effect[] {
  if (main.kind === "project" && route.screen === "project")
    return endImport(route.projectId, main.mediaImport);
  if (main.kind === "media" && route.screen === "media")
    return leaveWaveform(main.waveform, route);
  return [];
}

/** Tells the user that adding a picked file failed, even when its screen has gone by the time the failure arrives. */
function failureNotices(action: AppAction): Effect[] {
  if (action.type !== "requestSettled" || action.outcome.ok) return [];
  switch (action.request.kind) {
    case "addMediaFile":
      return [notice("The media file could not be added")];
    case "addSubtitleTrack":
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
  route: MainRoute,
  app: AppState,
): readonly [MainScreenState, readonly Effect[]] {
  if (main.kind === "media" && route.screen === "media")
    return updateMediaScreen(main, action, route, app);
  if (main.kind === "project" && route.screen === "project")
    return updateProjectScreen(main, action, route);
  if (main.kind === "offline") return updateOfflineScreen(main, action);
  return [main, []];
}
