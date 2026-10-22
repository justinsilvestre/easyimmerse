import { actions } from "../app/appAction.ts";
import type { EffectRunners } from "../app/runEffect.ts";
import type { DesktopServerEffect } from "./desktopServerEffect.ts";
import type { DesktopServerRequest } from "./desktopServerState.ts";

/** Performs the desktop server's effects through the platform's server controls, and reports each answer as an action. */
export const desktopServerEffectRunners = {
  subscribeToDesktopServerStatus: (_effect, { effects, dispatch }) => {
    effects.subscribeToDesktopServerStatus((status) =>
      dispatch(actions.desktopServerStatusReceived(status)),
    );
  },
  readDesktopServerStatus: (_effect, { effects, dispatch }) => {
    effects
      .readDesktopServerStatus()
      .then(
        (status) => dispatch(actions.desktopServerStatusReceived(status)),
        reportFailure("readStatus", dispatch),
      );
  },
  readDesktopServerSettings: (_effect, { effects, dispatch }) => {
    effects
      .readDesktopServerSettings()
      .then(
        (settings) => dispatch(actions.desktopServerSettingsLoaded(settings)),
        reportFailure("readSettings", dispatch),
      );
  },
  readDesktopServerLogs: (_effect, { effects, dispatch }) => {
    effects
      .readDesktopServerLogs()
      .then(
        (logs) => dispatch(actions.desktopServerLogsReceived(logs)),
        reportFailure("readLogs", dispatch),
      );
  },
  saveDesktopServerSettings: ({ settings, change }, { effects, dispatch }) => {
    effects
      .saveDesktopServerSettings(settings)
      .then(
        (status) =>
          dispatch(actions.desktopServerSettingsSaved(settings, status)),
        reportFailure(change, dispatch),
      );
  },
  startDesktopServer: ({ change }, { effects, dispatch }) => {
    effects
      .startDesktopServer()
      .then(
        (status) => dispatch(actions.desktopServerChanged(status)),
        reportFailure(change, dispatch),
      );
  },
  stopDesktopServer: (_effect, { effects, dispatch }) => {
    effects
      .stopDesktopServer()
      .then(
        (status) => dispatch(actions.desktopServerChanged(status)),
        reportFailure("stop", dispatch),
      );
  },
  pickExecutable: (_effect, { effects, dispatch }) => {
    effects
      .pickExecutable()
      .then(
        (path) => dispatch(actions.ffmpegBuildPicked(path)),
        reportFailure("saveFfmpegBuild", dispatch),
      );
  },
} satisfies EffectRunners<DesktopServerEffect>;

function reportFailure(
  request: DesktopServerRequest,
  dispatch: (
    action: ReturnType<typeof actions.desktopServerRequestFailed>,
  ) => void,
) {
  return (reason: unknown) =>
    dispatch(actions.desktopServerRequestFailed(request, messageOf(reason)));
}

/** The message of a rejection, which the server controls give as text or as an error. */
function messageOf(reason: unknown): string {
  if (typeof reason === "string") return reason;
  if (reason instanceof Error) return reason.message;
  return "The server controls did not answer.";
}
