import type {
  DesktopServerSettings,
  DesktopServerStatus,
  ServerLogEntry,
} from "@easyimmerse/types";

/** The fields of the server settings form as a person edits them. The extra expected hosts are one comma-separated text. */
export type DesktopServerSettingsFields = Pick<
  DesktopServerSettings,
  "bind" | "auth" | "open_signup" | "api_only" | "autostart"
> & { expected_hosts: string };

/** A request that changes the desktop app's server, during which the controls send no other. */
export type DesktopServerChange =
  | "start"
  | "stop"
  | "saveSettings"
  | "saveFfmpegBuild"
  /** Saving a bind address on the local network when the current one is loopback only, then starting. */
  | "startOnLan";

/** A request to the desktop app's server controls, under which its failure is kept. */
export type DesktopServerRequest =
  | DesktopServerChange
  | "readStatus"
  | "readSettings"
  | "readLogs";

/** What the desktop app knows of the server it runs, and the person's unsaved changes to its settings. */
export type DesktopServerState = {
  /** The last status the server controls reported, or null until the first arrives. */
  status: DesktopServerStatus | null;
  /** The settings as last read or saved, or null until they are read. */
  settings: DesktopServerSettings | null;
  /** The fields the person changed and has not saved. */
  edits: Partial<DesktopServerSettingsFields>;
  /** The server's recent log records, oldest first, or null until they are read. */
  logs: readonly ServerLogEntry[] | null;
  change: DesktopServerChange | null;
  /** Why the latest request of each kind failed, until it is sent again. */
  failures: Partial<Record<DesktopServerRequest, string>>;
};

export const initialDesktopServerState: DesktopServerState = {
  status: null,
  settings: null,
  edits: {},
  logs: null,
  change: null,
  failures: {},
};

/** The form's fields as the settings hold them. */
export function fieldsOf(
  settings: DesktopServerSettings,
): DesktopServerSettingsFields {
  return {
    bind: settings.bind,
    auth: settings.auth,
    open_signup: settings.open_signup,
    api_only: settings.api_only,
    autostart: settings.autostart,
    expected_hosts: settings.expected_hosts.join(", "),
  };
}

/** The settings with the form's fields in place of their own. */
export function settingsWith(
  settings: DesktopServerSettings,
  fields: DesktopServerSettingsFields,
): DesktopServerSettings {
  return {
    ...settings,
    ...fields,
    bind: fields.bind.trim(),
    expected_hosts: fields.expected_hosts
      .split(",")
      .map((host) => host.trim())
      .filter((host) => host !== ""),
  };
}

/** The edits that still differ from the settings. */
export function remainingEdits(
  settings: DesktopServerSettings,
  edits: Partial<DesktopServerSettingsFields>,
): Partial<DesktopServerSettingsFields> {
  const saved = fieldsOf(settings);
  return Object.fromEntries(
    Object.entries(edits).filter(
      ([key, value]) =>
        saved[key as keyof DesktopServerSettingsFields] !== value,
    ),
  );
}
