import type {
  DesktopServerSettings,
  DesktopServerStatus,
  ServerLogEntry,
} from "@easyimmerse/types";
import type {
  DesktopServerRequest,
  DesktopServerSettingsFields,
} from "./desktopServerState.ts";

/** The action creators of the server that the desktop app runs, its settings and its ffmpeg build. */
export const desktopServerActions = {
  /** The server controls reported the server's status, on request or because it changed. */
  desktopServerStatusReceived: (status: DesktopServerStatus) =>
    ({ type: "desktopServerStatusReceived", status }) as const,
  /** The server controls answered with the saved settings. */
  desktopServerSettingsLoaded: (settings: DesktopServerSettings) =>
    ({ type: "desktopServerSettingsLoaded", settings }) as const,
  /** The server controls answered with the server's recent log records. */
  desktopServerLogsReceived: (logs: readonly ServerLogEntry[]) =>
    ({ type: "desktopServerLogsReceived", logs }) as const,
  /** The person asked to read the log again. */
  desktopServerLogsRefreshRequested: () =>
    ({ type: "desktopServerLogsRefreshRequested" }) as const,
  /** The person changed fields of the server settings form. */
  desktopServerSettingsChanged: (
    changes: Partial<DesktopServerSettingsFields>,
  ) => ({ type: "desktopServerSettingsChanged", changes }) as const,
  /** The person saved the server settings form. */
  desktopServerSettingsSubmitted: () =>
    ({ type: "desktopServerSettingsSubmitted" }) as const,
  /** The server controls saved the settings and answered with the server's status afterwards. */
  desktopServerSettingsSaved: (
    settings: DesktopServerSettings,
    status: DesktopServerStatus,
  ) => ({ type: "desktopServerSettingsSaved", settings, status }) as const,
  /** The person asked to start the server as its settings are. */
  desktopServerStartRequested: () =>
    ({ type: "desktopServerStartRequested" }) as const,
  /** The person asked to start the server where other devices on the local network reach it. */
  desktopServerLanStartRequested: () =>
    ({ type: "desktopServerLanStartRequested" }) as const,
  /** The person asked to stop the server. */
  desktopServerStopRequested: () =>
    ({ type: "desktopServerStopRequested" }) as const,
  /** The server controls started or stopped the server and answered with its status. */
  desktopServerChanged: (status: DesktopServerStatus) =>
    ({ type: "desktopServerChanged", status }) as const,
  /** A request to the server controls failed with the message. */
  desktopServerRequestFailed: (
    request: DesktopServerRequest,
    message: string,
  ) => ({ type: "desktopServerRequestFailed", request, message }) as const,
  /** The person asked to choose an ffmpeg build. */
  ffmpegBuildPickRequested: () =>
    ({ type: "ffmpegBuildPickRequested" }) as const,
  /** The person picked a file as the ffmpeg executable, or cancelled when the path is null. */
  ffmpegBuildPicked: (path: string | null) =>
    ({ type: "ffmpegBuildPicked", path }) as const,
  /** The person asked to convert with the ffmpeg build that comes with the app. */
  bundledFfmpegBuildChosen: () =>
    ({ type: "bundledFfmpegBuildChosen" }) as const,
};

/** An action of the desktop app's server. */
export type DesktopServerAction = ReturnType<
  (typeof desktopServerActions)[keyof typeof desktopServerActions]
>;
