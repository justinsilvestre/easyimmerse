import type { DesktopServerSettings } from "@easyimmerse/types";
import type { DesktopServerChange } from "./desktopServerState.ts";

/**
 * The side effects of the desktop app's server: following its status, reading its settings and log,
 * saving its settings, starting and stopping it, and picking an ffmpeg executable.
 * A save or a start names the change it belongs to, under which a failure is reported.
 */
export type DesktopServerEffect =
  | { type: "subscribeToDesktopServerStatus" }
  | { type: "readDesktopServerStatus" }
  | { type: "readDesktopServerSettings" }
  | { type: "readDesktopServerLogs" }
  | {
      type: "saveDesktopServerSettings";
      settings: DesktopServerSettings;
      change: Extract<
        DesktopServerChange,
        "saveSettings" | "saveFfmpegBuild" | "startOnLan"
      >;
    }
  | {
      type: "startDesktopServer";
      change: Extract<DesktopServerChange, "start" | "startOnLan">;
    }
  | { type: "stopDesktopServer" }
  | { type: "pickExecutable" };
