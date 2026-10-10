import type { AppAction } from "../app/appAction.ts";
import type { AppState } from "../app/appState.ts";
import type { Effect } from "../app/effect.ts";
import type { Feature, FeatureUpdate } from "../app/feature.ts";
import { transientNotice } from "../notices/transientNotice.ts";
import type { MainRoute, Route } from "../route/route.ts";
import {
  isSameMainScreen,
  mainScreenOf,
  settingsPageOf,
} from "../route/route.ts";
import { routeAfter } from "../route/updateRoute.ts";
import { isAborted } from "../server/isAborted.ts";
import { leaveLookup } from "./lookup/lookupIds.ts";
import { mediaFileRequest } from "./mediaScreen/playbackRequests.ts";
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
  const [updatedDialog, dialogEffects] = updateDialog(
    screen.dialog,
    action,
    app,
  );
  const dialog =
    (isLeaving && isMediaScreenDialog(updatedDialog)) ||
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
    ...(isLeaving ? leavingEffects(updated, mainScreenOf(app.route)) : []),
    ...(isLeaving ? enteringEffects(mainScreenOf(route)) : []),
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
    return [...leaveWaveform(main.waveform, route), ...leaveLookup];
  return [];
}

/** Starts the work a main screen does as it opens. */
function enteringEffects(route: MainRoute): Effect[] {
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

/** Tells the user that a change they asked for failed, even when its screen has gone by the time the failure arrives. */
function failureNotices(action: AppAction): Effect[] {
  if (
    action.type !== "requestSettled" ||
    action.outcome.ok ||
    isAborted(action.outcome)
  )
    return [];
  switch (action.request.kind) {
    case "addMediaFile":
      return [failure("The media file could not be added")];
    case "addSubtitleTrack":
      return [failure("The subtitles file could not be added")];
    case "saveTrackSelection":
      return [failure("The track choice could not be saved")];
    case "deleteDictionary":
      return [failure("The dictionary could not be removed")];
    default:
      return [];
  }
}

function failure(message: string): Effect {
  return { type: "showNotice", content: transientNotice("danger", message) };
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
