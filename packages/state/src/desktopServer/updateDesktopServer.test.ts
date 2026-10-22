import { describe, expect, it } from "vitest";
import type { AppAction } from "../app/appAction.ts";
import { actions } from "../app/appAction.ts";
import type { Effect } from "../app/effect.ts";
import type { Route } from "../route/route.ts";
import type { ServerState } from "../server/serverState.ts";
import { lanSettings, runningOnLan, stopped } from "./desktopServerFixtures.ts";
import type { DesktopServerState } from "./desktopServerState.ts";
import {
  desktopServerFeature,
  updateDesktopServer,
} from "./updateDesktopServer.ts";

const desktop: ServerState = {
  config: {
    serverUrl: "http://127.0.0.1:5000",
    token: "t",
    bundledIn: "desktop",
  },
  cloudUrl: null,
};

const web: ServerState = { config: null, cloudUrl: null };

const home: Route = { screen: "home" };

/** The desktop server's state after the actions, seen from home, and the effects of the last one. */
function serverAfter(
  server: ServerState,
  ...serverActions: AppAction[]
): readonly [DesktopServerState, readonly Effect[]] {
  return serverActions.reduce<readonly [DesktopServerState, readonly Effect[]]>(
    ([state], action) =>
      updateDesktopServer(state, action, { server, route: home }),
    [desktopServerFeature.initialState, []],
  );
}

const loaded = actions.desktopServerSettingsLoaded(lanSettings);

describe("updateDesktopServer", () => {
  describe("when the app starts", () => {
    it("follows and reads the server's status and reads its settings on the desktop app", () => {
      const [, effects] = serverAfter(desktop, actions.appStarted());
      expect(effects).toEqual([
        { type: "subscribeToDesktopServerStatus" },
        { type: "readDesktopServerStatus" },
        { type: "readDesktopServerSettings" },
      ]);
    });

    it("does nothing elsewhere", () => {
      const [, effects] = serverAfter(web, actions.appStarted());
      expect(effects).toEqual([]);
    });
  });

  describe("when Settings open", () => {
    it("reads the settings and the log on the desktop app", () => {
      const [, effects] = serverAfter(
        desktop,
        actions.navigated({ type: "openSettings" }),
      );
      expect(effects).toEqual([
        { type: "readDesktopServerSettings" },
        { type: "readDesktopServerLogs" },
      ]);
    });

    it("reads them too when the platform asks for Settings", () => {
      const [, effects] = serverAfter(desktop, actions.settingsRequested());
      expect(effects).toHaveLength(2);
    });

    it("forgets unsaved changes", () => {
      const [state] = serverAfter(
        desktop,
        loaded,
        actions.desktopServerSettingsChanged({ autostart: true }),
        actions.navigated({ type: "openSettings" }),
      );
      expect(state.edits).toEqual({});
    });

    it("reads nothing on the web app", () => {
      const [, effects] = serverAfter(
        web,
        actions.navigated({ type: "openSettings" }),
      );
      expect(effects).toEqual([]);
    });
  });

  describe("when the form changes", () => {
    it("keeps the change", () => {
      const [state] = serverAfter(
        desktop,
        loaded,
        actions.desktopServerSettingsChanged({ bind: "0.0.0.0:9000" }),
      );
      expect(state.edits).toEqual({ bind: "0.0.0.0:9000" });
    });

    it("drops a change back to the saved value", () => {
      const [state] = serverAfter(
        desktop,
        loaded,
        actions.desktopServerSettingsChanged({ autostart: true }),
        actions.desktopServerSettingsChanged({ autostart: false }),
      );
      expect(state.edits).toEqual({});
    });
  });

  describe("when the form is saved", () => {
    it("saves the settings with the changes and the hosts as a list", () => {
      const [, effects] = serverAfter(
        desktop,
        loaded,
        actions.desktopServerSettingsChanged({
          auth: "accounts",
          expected_hosts: " books.example.org, ,nas.local ",
        }),
        actions.desktopServerSettingsSubmitted(),
      );
      expect(effects).toEqual([
        {
          type: "saveDesktopServerSettings",
          settings: {
            ...lanSettings,
            auth: "accounts",
            expected_hosts: ["books.example.org", "nas.local"],
          },
          change: "saveSettings",
        },
      ]);
    });

    it("saves nothing while the bind address cannot be read", () => {
      const [, effects] = serverAfter(
        desktop,
        loaded,
        actions.desktopServerSettingsChanged({ bind: "localhost" }),
        actions.desktopServerSettingsSubmitted(),
      );
      expect(effects).toEqual([]);
    });

    it("keeps the saved settings once the controls answer", () => {
      const saved = { ...lanSettings, autostart: true };
      const [state] = serverAfter(
        desktop,
        loaded,
        actions.desktopServerSettingsChanged({ autostart: true }),
        actions.desktopServerSettingsSubmitted(),
        actions.desktopServerSettingsSaved(saved, runningOnLan),
      );
      expect(state).toMatchObject({ settings: saved, edits: {}, change: null });
    });

    it("keeps the failure and the changes when the save fails", () => {
      const [state] = serverAfter(
        desktop,
        loaded,
        actions.desktopServerSettingsChanged({ autostart: true }),
        actions.desktopServerSettingsSubmitted(),
        actions.desktopServerRequestFailed("saveSettings", "disk full"),
      );
      expect(state).toMatchObject({
        edits: { autostart: true },
        change: null,
        failures: { saveSettings: "disk full" },
      });
    });
  });

  describe("when the server is started", () => {
    it("asks the controls to start it", () => {
      const [, effects] = serverAfter(
        desktop,
        actions.desktopServerStartRequested(),
      );
      expect(effects).toEqual([
        { type: "startDesktopServer", change: "start" },
      ]);
    });

    it("sends no second request while the first waits", () => {
      const [, effects] = serverAfter(
        desktop,
        actions.desktopServerStartRequested(),
        actions.desktopServerStopRequested(),
      );
      expect(effects).toEqual([]);
    });

    it("forgets the last start's failure", () => {
      const [state] = serverAfter(
        desktop,
        actions.desktopServerRequestFailed("start", "address in use"),
        actions.desktopServerStartRequested(),
      );
      expect(state.failures).toEqual({});
    });

    it("keeps the status the controls answer", () => {
      const [state] = serverAfter(
        desktop,
        actions.desktopServerStartRequested(),
        actions.desktopServerChanged(runningOnLan),
      );
      expect(state).toMatchObject({ status: runningOnLan, change: null });
    });
  });

  describe("when the server is started for the local network", () => {
    const loopback = actions.desktopServerSettingsLoaded({
      ...lanSettings,
      bind: "127.0.0.1:8787",
    });

    it("first saves a bind address on every interface at the same port", () => {
      const [, effects] = serverAfter(
        desktop,
        loopback,
        actions.desktopServerLanStartRequested(),
      );
      expect(effects).toEqual([
        {
          type: "saveDesktopServerSettings",
          settings: lanSettings,
          change: "startOnLan",
        },
      ]);
    });

    it("then starts the server", () => {
      const [, effects] = serverAfter(
        desktop,
        loopback,
        actions.desktopServerLanStartRequested(),
        actions.desktopServerSettingsSaved(lanSettings, stopped),
      );
      expect(effects).toEqual([
        { type: "startDesktopServer", change: "startOnLan" },
      ]);
    });

    it("starts at once when the bind address already reaches the network", () => {
      const [, effects] = serverAfter(
        desktop,
        loaded,
        actions.desktopServerLanStartRequested(),
      );
      expect(effects).toEqual([
        { type: "startDesktopServer", change: "startOnLan" },
      ]);
    });
  });

  describe("when an ffmpeg build is picked", () => {
    it("saves the directory of the executable", () => {
      const [, effects] = serverAfter(
        desktop,
        loaded,
        actions.ffmpegBuildPicked("/opt/homebrew/bin/ffmpeg"),
      );
      expect(effects).toEqual([
        {
          type: "saveDesktopServerSettings",
          settings: { ...lanSettings, ffmpeg_dir: "/opt/homebrew/bin" },
          change: "saveFfmpegBuild",
        },
      ]);
    });

    it("refuses a file that is not ffmpeg", () => {
      const [state] = serverAfter(
        desktop,
        loaded,
        actions.ffmpegBuildPicked("/opt/homebrew/bin/ffprobe"),
      );
      expect(state.failures.saveFfmpegBuild).toBe(
        "Choose the program named ffmpeg (ffmpeg.exe on Windows) in the build's folder.",
      );
    });

    it("does nothing when the pick was cancelled", () => {
      const [, effects] = serverAfter(
        desktop,
        loaded,
        actions.ffmpegBuildPicked(null),
      );
      expect(effects).toEqual([]);
    });

    it("keeps the server form's unsaved changes", () => {
      const [state] = serverAfter(
        desktop,
        loaded,
        actions.desktopServerSettingsChanged({ autostart: true }),
        actions.ffmpegBuildPicked("/usr/bin/ffmpeg"),
        actions.desktopServerSettingsSaved(
          { ...lanSettings, ffmpeg_dir: "/usr/bin" },
          runningOnLan,
        ),
      );
      expect(state.edits).toEqual({ autostart: true });
    });
  });

  it("clears the ffmpeg directory for the bundled build", () => {
    const [, effects] = serverAfter(
      desktop,
      actions.desktopServerSettingsLoaded({ ...lanSettings, ffmpeg_dir: "/x" }),
      actions.bundledFfmpegBuildChosen(),
    );
    expect(effects).toEqual([
      {
        type: "saveDesktopServerSettings",
        settings: lanSettings,
        change: "saveFfmpegBuild",
      },
    ]);
  });

  it("reads the log again on request", () => {
    const [, effects] = serverAfter(
      desktop,
      actions.desktopServerLogsRefreshRequested(),
    );
    expect(effects).toEqual([{ type: "readDesktopServerLogs" }]);
  });
});
