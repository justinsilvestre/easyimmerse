import { describe, expect, it, vi } from "vitest";
import { actions } from "../app/appAction.ts";
import { createAppStore } from "../app/createAppStore.ts";
import { createFakeServerStoreParts } from "../app/createFakeServerStoreParts.ts";
import { createRecordingEffects } from "../platform/recordingEffects.ts";
import { lanSettings, runningOnLan, stopped } from "./desktopServerFixtures.ts";
import {
  selectDesktopServerLogs,
  selectDesktopServerStatus,
  selectFfmpegBuildChoice,
} from "./desktopServerSelectors.ts";

/** A store of the desktop app, with the effects it records. */
function desktopStore() {
  const effects = createRecordingEffects();
  const store = createAppStore(
    effects,
    createFakeServerStoreParts({
      serverUrl: "http://127.0.0.1:5000",
      token: "t",
      bundledIn: "desktop",
    }),
  );
  return { effects, store };
}

describe("desktopServerEffectRunners", () => {
  it("keeps the status the controls read when the app starts", async () => {
    const { effects, store } = desktopStore();
    effects.resolveDesktopServer("readDesktopServerStatus", runningOnLan);
    await vi.waitFor(() =>
      expect(selectDesktopServerStatus(store.getState()).state).toBe("running"),
    );
  });

  it("follows the status the controls report", () => {
    const { effects, store } = desktopStore();
    effects.changeDesktopServerStatus(stopped);
    expect(selectDesktopServerStatus(store.getState()).state).toBe("stopped");
  });

  it("shows why a start was refused", async () => {
    const { effects, store } = desktopStore();
    store.dispatch(actions.desktopServerStartRequested());
    effects.rejectDesktopServer("startDesktopServer", "address in use");
    await vi.waitFor(() =>
      expect(selectDesktopServerStatus(store.getState()).failure).toBe(
        "address in use",
      ),
    );
  });

  it("keeps the log the controls read when Settings open", async () => {
    const { effects, store } = desktopStore();
    store.dispatch(actions.navigated({ type: "openSettings" }));
    const entry = {
      time_ms: 1,
      level: "warn",
      target: "easyimmerse_api",
      message: "slow",
    } as const;
    effects.resolveDesktopServer("readDesktopServerLogs", [entry]);
    await vi.waitFor(() =>
      expect(selectDesktopServerLogs(store.getState()).entries).toEqual([
        entry,
      ]),
    );
  });

  it("saves the directory of the ffmpeg executable the person picked", async () => {
    const { effects, store } = desktopStore();
    effects.resolveDesktopServer("readDesktopServerSettings", lanSettings);
    await vi.waitFor(() =>
      expect(selectFfmpegBuildChoice(store.getState()).canChoose).toBe(true),
    );
    store.dispatch(actions.ffmpegBuildPickRequested());
    effects.resolvePickExecutable("/usr/local/bin/ffmpeg");
    await vi.waitFor(() =>
      expect(effects.calls).toContainEqual({
        type: "saveDesktopServerSettings",
        settings: { ...lanSettings, ffmpeg_dir: "/usr/local/bin" },
      }),
    );
  });
});
