import type {
  DesktopServerStatus,
  ServerLogEntry,
  ServerRunState,
} from "@easyimmerse/types";
import { createSelector } from "reselect";
import type { AppRoot } from "../app/createAppStore.ts";
import { readBindAddress } from "./bindAddress.ts";
import {
  type DesktopServerSettingsFields,
  type DesktopServerState,
  fieldsOf,
} from "./desktopServerState.ts";

/**
 * The desktop server as pairing sees it: not known yet when null; not running; starting; running where only this computer reaches it;
 * or running on the local network, with accounts or with the launch token. `url` is the address other devices use.
 */
export type DesktopPairingServer =
  | { kind: "stopped" }
  | { kind: "starting" }
  | { kind: "loopbackOnly" }
  | { kind: "running"; url: string; hasAccounts: boolean };

/** The server's status as the server settings show it. */
export type DesktopServerStatusView = {
  /** Whether the server runs, or `unknown` until its status first arrives. */
  state: ServerRunState["kind"] | "unknown";
  /** Why the server failed, or why the last request to start, stop or read it failed. */
  failure: string | null;
  urls: readonly string[];
  isLanReachable: boolean;
  servesWebApp: boolean;
  canStart: boolean;
  canStop: boolean;
  /** Whether a start, stop or save is under way. */
  isChanging: boolean;
};

/** The server settings form as it shows. */
export type DesktopServerSettingsFormView =
  | { status: "loading" }
  | { status: "failed"; message: string }
  | {
      status: "loaded";
      fields: DesktopServerSettingsFields;
      /** Why the bind address cannot be saved, or null when it can. */
      bindProblem: string | null;
      hasChanges: boolean;
      canSave: boolean;
      isSaving: boolean;
      /** Whether saving the changes restarts the running server. */
      restartsServer: boolean;
      saveFailure: string | null;
    };

/** The server's recent log as it shows: its records oldest first, or null until they arrive. */
export type DesktopServerLogsView = {
  entries: readonly ServerLogEntry[] | null;
  failure: string | null;
};

/** What the media conversion settings may do about the ffmpeg build. */
export type FfmpegBuildChoiceView = {
  canChoose: boolean;
  isSaving: boolean;
  failure: string | null;
};

const selectState = (state: AppRoot) => state.app.desktopServer;

/** Returns the server's status as the server settings show it. */
export const selectDesktopServerStatus = createSelector(
  [selectState],
  (server): DesktopServerStatusView => {
    const state = server.status?.state.kind ?? "unknown";
    const isIdle = server.change === null;
    return {
      state,
      failure: statusFailureOf(server),
      urls: server.status?.urls ?? [],
      isLanReachable: server.status?.lan_reachable ?? false,
      servesWebApp: server.status?.serves_web_app ?? false,
      canStart: isIdle && (state === "stopped" || state === "failed"),
      canStop: isIdle && (state === "running" || state === "starting"),
      isChanging: !isIdle,
    };
  },
);

/** Returns the server settings form as it shows. */
export const selectDesktopServerSettingsForm = createSelector(
  [selectState],
  (server): DesktopServerSettingsFormView => {
    const { settings, edits, failures } = server;
    if (settings === null)
      return failures.readSettings === undefined
        ? { status: "loading" }
        : { status: "failed", message: failures.readSettings };
    const fields = { ...fieldsOf(settings), ...edits };
    const reading = readBindAddress(fields.bind);
    const hasChanges = Object.keys(edits).length > 0;
    return {
      status: "loaded",
      fields,
      bindProblem: reading.ok ? null : reading.problem,
      hasChanges,
      canSave: hasChanges && reading.ok && server.change === null,
      isSaving: server.change === "saveSettings",
      restartsServer:
        server.status?.state.kind === "running" &&
        Object.keys(edits).some((key) => key !== "autostart"),
      saveFailure: failures.saveSettings ?? null,
    };
  },
);

/** Returns the server's recent log as it shows. */
export const selectDesktopServerLogs = createSelector(
  [selectState],
  (server): DesktopServerLogsView => ({
    entries: server.logs,
    failure: server.failures.readLogs ?? null,
  }),
);

/** Tells whether the server runs on the local network with only the launch token, so that anyone there can use it. */
export const selectIsDesktopServerUnauthenticatedOnLan = (state: AppRoot) => {
  const { status, settings } = selectState(state);
  return (
    status?.state.kind === "running" &&
    status.lan_reachable &&
    settings?.auth === "launch_token"
  );
};

/** Tells whether the server settings ask for accounts. */
export const selectDoesDesktopServerUseAccounts = (state: AppRoot) =>
  selectState(state).settings?.auth === "accounts";

/** Returns the server as pairing sees it, or null until its status and settings are known. */
export const selectDesktopPairingServer = createSelector(
  [selectState],
  ({ status, settings }): DesktopPairingServer | null => {
    if (status === null) return null;
    switch (status.state.kind) {
      case "stopped":
      case "failed":
        return { kind: "stopped" };
      case "starting":
        return { kind: "starting" };
      case "running":
        return runningPairingServer(status, settings?.auth ?? null);
    }
  },
);

/** Returns what the media conversion settings may do about the ffmpeg build. */
export const selectFfmpegBuildChoice = createSelector(
  [selectState],
  (server): FfmpegBuildChoiceView => ({
    canChoose: server.settings !== null && server.change === null,
    isSaving: server.change === "saveFfmpegBuild",
    failure: server.failures.saveFfmpegBuild ?? null,
  }),
);

function runningPairingServer(
  status: DesktopServerStatus,
  auth: string | null,
): DesktopPairingServer | null {
  const url = status.pairing_url ?? status.urls[0];
  if (!status.lan_reachable || url === undefined)
    return { kind: "loopbackOnly" };
  if (auth === null) return null;
  return { kind: "running", url, hasAccounts: auth === "accounts" };
}

function statusFailureOf(server: DesktopServerState): string | null {
  const { status, failures } = server;
  if (status?.state.kind === "failed") return status.state.message;
  return (
    failures.start ??
    failures.stop ??
    failures.startOnLan ??
    failures.readStatus ??
    null
  );
}
