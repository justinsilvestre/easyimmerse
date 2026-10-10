import type { AppAction } from "../app/appAction.ts";
import type { AppState } from "../app/appState.ts";
import type { Feature, FeatureUpdate } from "../app/feature.ts";
import { updated } from "../app/updated.ts";
import { mainScreenMoveOf } from "../route/mainScreenMoveOf.ts";
import type { MainRoute, Route } from "../route/route.ts";
import { mainScreenOf, settingsPageOf } from "../route/route.ts";
import { routeAfter } from "../route/updateRoute.ts";
import { failureNotices } from "./failureNotices.ts";
import { leaveLookup } from "./lookup/lookupIds.ts";
import { mediaScreenActionOf } from "./mediaScreen/mediaScreenActionOf.ts";
import { mediaFileRequest } from "./mediaScreen/playbackRequests.ts";
import { skippedSourceSubtitles } from "./mediaScreen/sourceMedia/skippedSourceSubtitles.ts";
import { endSourceMedia } from "./mediaScreen/sourceMedia/sourceMediaRequests.ts";
import { updateMediaScreen } from "./mediaScreen/updateMediaScreen.ts";
import { leaveWaveform } from "./mediaScreen/updateWaveform.ts";
import { updateOfflineScreen } from "./offlineScreen/updateOfflineScreen.ts";
import { updateProjectForm } from "./projectForm/updateProjectForm.ts";
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
  const [updatedMain, mainEffects] = updateMainScreen(
    screen.main,
    action,
    mainScreenOf(app.route),
    app,
  );
  const route = routeAfter(app, action);
  const move = mainScreenMoveOf(app, action);
  const nextMain =
    move !== null ? initialMainScreen(move.to, app.storedPlaces) : updatedMain;
  const [updatedDialog, dialogEffects] = updateDialog(
    screen.dialog,
    action,
    app,
  );
  const dialog =
    (move !== null && isMediaScreenDialog(updatedDialog)) ||
    isLeftDictionaryQuestion(updatedDialog, route)
      ? null
      : updatedDialog;
  const [settings, settingsEffects] = updateSettings(
    screen.settings,
    action,
    route,
  );
  const opened = projectOpenedBy(app, action);
  const effects = [
    ...mainEffects,
    ...(move !== null ? leavingEffects(updatedMain, move.from) : []),
    ...(move !== null ? enteringEffects(move.to) : []),
    ...dialogEffects,
    ...settingsEffects,
    ...failureNotices(action),
    ...skippedSourceSubtitles(action),
    ...(opened === null ? [] : [markOpened(opened)]),
  ];
  return nextMain === screen.main &&
    settings === screen.settings &&
    dialog === screen.dialog
    ? updated(screen, ...effects)
    : updated({ main: nextMain, settings, dialog }, ...effects);
};

/** The screens as a feature: the state of the main screen, of Settings and of the open dialog. */
export const screenFeature: Feature<ScreenState> = {
  initialState: initialScreen,
  update: updateScreen,
};

/** Stops the work that belongs to a main screen being replaced. */
function leavingEffects(main: MainScreenState, route: MainRoute) {
  if (main.kind === "project" && route.screen === "project")
    return endImport(route.projectId, main.mediaImport);
  if (main.kind === "media" && route.screen === "media")
    return [
      ...leaveWaveform(main.waveform, route),
      ...leaveLookup,
      ...(main.sourceMedia === null ? [] : endSourceMedia(route.mediaFileId)),
    ];
  return [];
}

/** Starts the work a main screen does as it opens. */
function enteringEffects(route: MainRoute) {
  return route.screen === "media" ? [mediaFileRequest(route)] : [];
}

/** Tells whether a dialog belongs to the media screen, which closes with the screen. */
function isMediaScreenDialog(dialog: ScreenState["dialog"]): boolean {
  return (
    dialog?.kind === "trackChoice" ||
    dialog?.kind === "conversionNotice" ||
    dialog?.kind === "subtitleAppearance"
  );
}

/** Tells whether a dialog is the question whether to remove a dictionary, while the dictionaries page is no longer on top. */
function isLeftDictionaryQuestion(
  dialog: ScreenState["dialog"],
  route: Route,
): boolean {
  return (
    dialog?.kind === "removeDictionary" &&
    (route.screen !== "settings" || settingsPageOf(route) !== "dictionaries")
  );
}

function updateMainScreen(
  main: MainScreenState,
  action: AppAction,
  route: MainRoute,
  app: AppState,
) {
  if (main.kind === "media" && route.screen === "media")
    return updateMediaScreen(main, mediaScreenActionOf(app, action), app);
  if (main.kind === "project" && route.screen === "project")
    return updateProjectScreen(main, action, route);
  if (main.kind === "offline") return updateOfflineScreen(main, action);
  if (route.screen === "newProject" || route.screen === "projectSettings")
    return updated(main, ...updateProjectForm(route, action, app));
  return updated(main);
}
