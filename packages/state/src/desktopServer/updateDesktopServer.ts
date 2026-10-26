import type { AppAction } from "../app/appAction.ts";
import type { Feature, ReadableState } from "../app/feature.ts";
import { updated } from "../app/updated.ts";
import { routeAfter } from "../route/updateRoute.ts";
import { lanBindOf, readBindAddress } from "./bindAddress.ts";
import type { DesktopServerEffect } from "./desktopServerEffect.ts";
import {
  type DesktopServerChange,
  type DesktopServerRequest,
  type DesktopServerState,
  fieldsOf,
  initialDesktopServerState,
  remainingEdits,
  settingsWith,
} from "./desktopServerState.ts";
import { directoryOf, isFfmpegExecutable } from "./ffmpegExecutable.ts";

type Reads = Pick<ReadableState, "server" | "route">;

/**
 * Keeps what the desktop app knows of the server it runs, and sends its requests to the server controls.
 * On the desktop app, it follows the server's status from the start and reads its settings,
 * and reads the settings and the log again whenever Settings open, with the status when it could not be read before.
 * A start for the local network first saves a bind address on every interface at the same port, when the current one is loopback only.
 */
export function updateDesktopServer(
  state: DesktopServerState,
  action: AppAction,
  app: Reads,
) {
  switch (action.type) {
    case "appStarted":
      return isDesktop(app)
        ? updated(
            state,
            { type: "subscribeToDesktopServerStatus" },
            { type: "readDesktopServerStatus" },
            { type: "readDesktopServerSettings" },
          )
        : updated(state);
    case "locationChanged":
      return opensSettings(app, action)
        ? updated(
            { ...state, edits: {} },
            { type: "readDesktopServerSettings" },
            { type: "readDesktopServerLogs" },
            ...statusRetries(state),
          )
        : updated(state);
    case "desktopServerStatusReceived":
      return updated({
        ...withoutFailure(state, "readStatus"),
        status: action.status,
      });
    case "desktopServerSettingsLoaded":
      return updated({
        ...withoutFailure(state, "readSettings"),
        settings: action.settings,
        edits: remainingEdits(action.settings, state.edits),
      });
    case "desktopServerLogsReceived":
      return updated({ ...state, logs: action.logs });
    case "desktopServerLogsRefreshRequested":
      return updated(withoutFailure(state, "readLogs"), {
        type: "readDesktopServerLogs",
      });
    case "desktopServerSettingsChanged":
      return state.settings === null
        ? updated(state)
        : updated({
            ...state,
            edits: remainingEdits(state.settings, {
              ...state.edits,
              ...action.changes,
            }),
          });
    case "desktopServerSettingsSubmitted":
      return submitted(state);
    case "desktopServerSettingsSaved":
      return saved(state, action);
    case "desktopServerStartRequested":
      return beginning(state, "start", {
        type: "startDesktopServer",
        change: "start",
      });
    case "desktopServerLanStartRequested":
      return lanStartRequested(state);
    case "desktopServerStopRequested":
      return beginning(state, "stop", { type: "stopDesktopServer" });
    case "desktopServerChanged":
      return updated({ ...state, status: action.status, change: null });
    case "desktopServerRequestFailed":
      return updated({
        ...state,
        change: state.change === action.request ? null : state.change,
        failures: { ...state.failures, [action.request]: action.message },
      });
    case "ffmpegBuildPickRequested":
      return state.settings === null || state.change !== null
        ? updated(state)
        : updated(withoutFailure(state, "saveFfmpegBuild"), {
            type: "pickExecutable",
          });
    case "ffmpegBuildPicked":
      return ffmpegBuildPicked(state, action.path);
    case "bundledFfmpegBuildChosen":
      return savingFfmpegDir(state, null);
    default:
      return updated(state);
  }
}

function isDesktop({ server }: Reads): boolean {
  return server.config?.bundledIn === "desktop";
}

/** Tells whether the location the action reports opens Settings over a main screen in the desktop app. */
function opensSettings(app: Reads, action: AppAction): boolean {
  return (
    isDesktop(app) &&
    app.route.screen !== "settings" &&
    routeAfter(app, action).screen === "settings"
  );
}

/** Reads the status again when it could not be read before, since no status event may follow. */
function statusRetries(state: DesktopServerState): DesktopServerEffect[] {
  return state.failures.readStatus === undefined
    ? []
    : [{ type: "readDesktopServerStatus" }];
}

function withoutFailure(
  state: DesktopServerState,
  request: DesktopServerRequest,
): DesktopServerState {
  if (!(request in state.failures)) return state;
  const { [request]: _cleared, ...failures } = state.failures;
  return { ...state, failures };
}

/** Starts a change unless another is under way, forgetting how the last change of its kind failed. */
function beginning(
  state: DesktopServerState,
  change: DesktopServerChange,
  effect: DesktopServerEffect,
) {
  if (state.change !== null) return updated(state);
  return updated({ ...withoutFailure(state, change), change }, effect);
}

function submitted(state: DesktopServerState) {
  if (state.settings === null) return updated(state);
  const fields = { ...fieldsOf(state.settings), ...state.edits };
  if (!readBindAddress(fields.bind).ok) return updated(state);
  return beginning(state, "saveSettings", {
    type: "saveDesktopServerSettings",
    settings: settingsWith(state.settings, fields),
    change: "saveSettings",
  });
}

function saved(
  state: DesktopServerState,
  action: Extract<AppAction, { type: "desktopServerSettingsSaved" }>,
) {
  const next = {
    ...state,
    settings: action.settings,
    status: action.status,
    edits: remainingEdits(action.settings, state.edits),
  };
  return state.change === "startOnLan"
    ? updated(next, { type: "startDesktopServer", change: "startOnLan" })
    : updated({ ...next, change: null });
}

function lanStartRequested(state: DesktopServerState) {
  const lanBind = state.settings && lanBindOf(state.settings.bind);
  if (state.settings === null || lanBind === null)
    return beginning(state, "startOnLan", {
      type: "startDesktopServer",
      change: "startOnLan",
    });
  return beginning(state, "startOnLan", {
    type: "saveDesktopServerSettings",
    settings: { ...state.settings, bind: lanBind },
    change: "startOnLan",
  });
}

function ffmpegBuildPicked(state: DesktopServerState, path: string | null) {
  if (path === null) return updated(state);
  if (!isFfmpegExecutable(path))
    return updated({
      ...state,
      failures: {
        ...state.failures,
        saveFfmpegBuild:
          "Choose the program named ffmpeg (ffmpeg.exe on Windows) in the build's folder.",
      },
    });
  return savingFfmpegDir(state, directoryOf(path));
}

function savingFfmpegDir(state: DesktopServerState, ffmpegDir: string | null) {
  if (state.settings === null) return updated(state);
  return beginning(state, "saveFfmpegBuild", {
    type: "saveDesktopServerSettings",
    settings: { ...state.settings, ffmpeg_dir: ffmpegDir },
    change: "saveFfmpegBuild",
  });
}

/** The desktop app's server as a feature. */
export const desktopServerFeature: Feature<
  DesktopServerState,
  "server" | "route"
> = {
  initialState: initialDesktopServerState,
  update: updateDesktopServer,
};
