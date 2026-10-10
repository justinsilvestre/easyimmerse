import type { AppAction } from "../app/appAction.ts";
import { combineUpdates } from "../app/combineUpdates.ts";
import type { Feature } from "../app/feature.ts";
import { updated } from "../app/updated.ts";
import { mainScreenMoveOf } from "../route/mainScreenMoveOf.ts";
import type { MainRoute, MediaRoute } from "../route/route.ts";
import { mainScreenOf } from "../route/route.ts";
import { routeAfter } from "../route/updateRoute.ts";
import { leaveLookup } from "./lookup/lookupIds.ts";
import { mediaScreenActionOf } from "./mediaScreen/mediaScreenActionOf.ts";
import { mediaFileRequest } from "./mediaScreen/playbackRequests.ts";
import { endSourceMedia } from "./mediaScreen/sourceMedia/sourceMediaRequests.ts";
import { updateMediaScreen } from "./mediaScreen/updateMediaScreen.ts";
import { leaveWaveform } from "./mediaScreen/updateWaveform.ts";
import {
  abortParse,
  updateOfflineScreen,
} from "./offlineScreen/updateOfflineScreen.ts";
import { updateProjectForm } from "./projectForm/updateProjectForm.ts";
import { endImport } from "./projectScreen/mediaImportRequests.ts";
import { updateProjectScreen } from "./projectScreen/updateProjectScreen.ts";
import type { ScreenApp } from "./screenApp.ts";
import type {
  MainScreenState,
  MediaScreenState,
  ScreenState,
} from "./screenState.ts";
import { initialMainScreen, initialScreen } from "./screenState.ts";
import { updateDialog } from "./updateDialog.ts";
import { updateSettings } from "./updateSettings.ts";

/** Updates the main screen, Settings and the open dialog, each from the state before the action. */
export const updateScreen = combineUpdates<ScreenState, [ScreenApp]>({
  main: updateMain,
  settings: (settings, action, app) =>
    updateSettings(settings, action, routeAfter(app, action)),
  dialog: updateDialog,
});

/** The screens as a feature: the state of the main screen, of Settings and of the open dialog. */
export const screenFeature: Feature<ScreenState, keyof ScreenApp> = {
  initialState: initialScreen,
  update: updateScreen,
};

/**
 * Runs the shown screen's own update, which sees every action, the one that leaves it included,
 * then starts the main screen over when the action moves the route to another one.
 */
function updateMain(main: MainScreenState, action: AppAction, app: ScreenApp) {
  const [next, effects] = updateShownScreen(main, action, app);
  const move = mainScreenMoveOf(app, action);
  if (move === null) return updated(next, ...effects);
  return updated(
    initialMainScreen(move.to, app.storedPlaces),
    ...effects,
    ...leavingEffects(next, move.from),
    ...enteringEffects(move.to),
  );
}

function updateShownScreen(
  main: MainScreenState,
  action: AppAction,
  app: ScreenApp,
) {
  const route = mainScreenOf(app.route);
  if (main.kind === "media" && route.screen === "media")
    return updateMediaScreen(main, mediaScreenActionOf(app, action), app);
  if (main.kind === "project" && route.screen === "project")
    return updateProjectScreen(main, action, route);
  if (main.kind === "offline") return updateOfflineScreen(main, action);
  if (route.screen === "newProject" || route.screen === "projectSettings")
    return updated(main, ...updateProjectForm(route, action, app));
  return updated(main);
}

/** Stops the work that belongs to a main screen being replaced. */
function leavingEffects(main: MainScreenState, route: MainRoute) {
  if (main.kind === "project" && route.screen === "project")
    return endImport(route.projectId, main.mediaImport);
  if (main.kind === "offline") return [abortParse];
  if (main.kind === "media" && route.screen === "media")
    return leaveMediaScreen(main, route);
  return [];
}

/** Starts the work a main screen does as it opens. */
function enteringEffects(route: MainRoute) {
  return route.screen === "media" ? [mediaFileRequest(route)] : [];
}

function leaveMediaScreen(main: MediaScreenState, route: MediaRoute) {
  const leaving = [...leaveWaveform(main.waveform, route), ...leaveLookup];
  if (main.sourceMedia === null) return leaving;
  return [...leaving, ...endSourceMedia(route.mediaFileId)];
}
