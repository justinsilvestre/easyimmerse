import type { StoreEnhancer } from "redux";
import { describe, expect, it, vi } from "vitest";
import { selectNotices } from "../notices/noticesSelectors.ts";
import { runningImportStatus } from "../operations/exampleJobReports.ts";
import { createRecordingEffects } from "../platform/recordingEffects.ts";
import { actions } from "./appAction.ts";
import { createAppStore } from "./createAppStore.ts";
import {
  createFakeServerStoreParts,
  type FakeServerStoreParts,
} from "./createFakeServerStoreParts.ts";
import { initialAppState } from "./update.ts";

describe("createAppStore", () => {
  it("starts the app slice at the initial app state", () => {
    const store = createAppStore(
      createRecordingEffects(),
      createFakeServerStoreParts(),
    );
    expect(store.getState().app).toEqual(initialAppState);
  });

  it("seeds the server state from the server parts", () => {
    const server = { serverUrl: "http://localhost:4000", token: "test-token" };
    const store = createAppStore(
      createRecordingEffects(),
      createFakeServerStoreParts(server),
    );
    expect(store.getState().app.server).toEqual({ config: server });
  });

  it("mounts the server reducer under its reducer path", () => {
    const store = createAppStore(
      createRecordingEffects(),
      createFakeServerStoreParts(),
    );
    expect(store.getState().fakeServer).toEqual({ mounted: true });
  });

  it("passes dispatched actions through the server middleware", () => {
    const server = createFakeServerStoreParts();
    const store = createAppStore(createRecordingEffects(), server);
    store.dispatch(actions.playerTimeChanged(1));
    expect(server.dispatchedActions).toContainEqual(
      actions.playerTimeChanged(1),
    );
  });

  it("opens Settings when the platform asks for them", () => {
    const effects = createRecordingEffects();
    const store = createAppStore(effects, createFakeServerStoreParts());
    effects.requestSettings();
    expect(store.getState().app.route.screen).toBe("settings");
  });

  it("dispatches appStarted once it is created", () => {
    const server = createFakeServerStoreParts();
    createAppStore(createRecordingEffects(), server);
    expect(server.dispatchedActions).toEqual([actions.appStarted()]);
  });

  it("resumes a media file where playback last was", async () => {
    const effects = createRecordingEffects({ "playbackPosition:m1": "90000" });
    const store = createAppStore(effects, createFakeServerStoreParts());
    store.dispatch(actions.openMediaFileRequested("p1", "m1"));
    await vi.waitFor(() =>
      expect(store.getState().app.storedPlaces.playback.m1).toBe(90_000),
    );
    store.dispatch(actions.playerDurationChanged(600));
    expect(effects.calls).toContainEqual({ type: "seekPlayer", seconds: 90 });
  });

  it("builds the store through the given enhancer composer", () => {
    const composed: StoreEnhancer[][] = [];
    createAppStore(
      createRecordingEffects(),
      createFakeServerStoreParts(),
      (...enhancers) => {
        composed.push(enhancers);
        return (next) => next;
      },
    );
    expect(composed).toHaveLength(1);
  });

  describe("for a transient notice", () => {
    const saved = {
      tone: "success",
      message: "Saved",
      buttons: [],
      isTransient: true,
    } as const;

    it("removes it ten seconds after it was shown", () => {
      const effects = createRecordingEffects();
      const store = createAppStore(effects, createFakeServerStoreParts());
      store.dispatch(actions.noticeRequested(saved));
      effects.clock.advanceBy(10_000);
      expect(selectNotices(store.getState())).toEqual([]);
    });

    it("keeps it while the pointer rests on it", () => {
      const effects = createRecordingEffects();
      const store = createAppStore(effects, createFakeServerStoreParts());
      store.dispatch(actions.noticeRequested(saved));
      store.dispatch(actions.noticeHeld(1, "pointer"));
      effects.clock.advanceBy(20_000);
      expect(selectNotices(store.getState())).toHaveLength(1);
    });
  });

  describe("while a dictionary import's job runs", () => {
    const zip = {
      name: "jmdict.zip",
      source: { kind: "path", path: "/d/jmdict.zip" },
    } as const;
    const importRequest = {
      kind: "importDictionary",
      file: zip,
      tableLayout: null,
    } as const;
    const statusRequest = { kind: "getImportJob", jobId: "job1" } as const;

    /** Starts an import whose job reports that it runs, and returns the store once that report has arrived. */
    async function startRunningImport() {
      const effects = createRecordingEffects();
      const server = createFakeServerStoreParts();
      const store = createAppStore(effects, server);
      store.dispatch(actions.navigated({ type: "openDictionaries" }));
      store.dispatch(actions.dictionaryFileChosen(zip));
      server.respond(importRequest, { ok: true, data: { id: "job1" } });
      await vi.waitFor(() => expect(statusRequests(server)).toHaveLength(1));
      server.respond(statusRequest, { ok: true, data: runningImportStatus });
      await vi.waitFor(() =>
        expect(server.dispatchedActions).toContainEqual(
          expect.objectContaining({ id: "jobs/dictionaryImport/job1" }),
        ),
      );
      return { effects, server, store };
    }

    const statusRequests = (server: FakeServerStoreParts) =>
      server.sentRequests.filter(({ kind }) => kind === "getImportJob");

    it("asks for the job's status again once the interval has passed", async () => {
      const { effects, server } = await startRunningImport();
      effects.clock.advanceBy(500);
      expect(statusRequests(server)).toHaveLength(2);
    });

    it("asks nothing before the interval has passed", async () => {
      const { effects, server } = await startRunningImport();
      effects.clock.advanceBy(499);
      expect(statusRequests(server)).toHaveLength(1);
    });

    it("stops asking once the dictionaries page closes", async () => {
      const { effects, server, store } = await startRunningImport();
      store.dispatch(actions.navigated({ type: "closeSettings" }));
      effects.clock.advanceBy(500);
      expect(statusRequests(server)).toHaveLength(1);
    });
  });

  describe("when a waveform window fails", () => {
    const windowRequest = {
      kind: "getWaveformWindow",
      projectId: "p1",
      mediaFileId: "m1",
      startMs: 0,
      endMs: 30_000,
    } as const;

    /** Opens m1, has its only window fail, and returns the store once the failure has arrived. */
    async function failWindow() {
      const effects = createRecordingEffects();
      const server = createFakeServerStoreParts();
      const store = createAppStore(effects, server);
      store.dispatch(actions.openMediaFileRequested("p1", "m1"));
      store.dispatch(
        actions.waveformViewChanged("player", {
          viewStartMs: 0,
          viewEndMs: 30_000,
          focusMs: 0,
          durationMs: 30_000,
        }),
      );
      server.respond(windowRequest, {
        ok: false,
        error: { status: 500, message: "down" },
      });
      await vi.waitUntil(() =>
        server.dispatchedActions.some(
          (action) =>
            "id" in action && action.id === "media/m1/waveform/player/0",
        ),
      );
      return { effects, server };
    }

    const windowRequests = (server: FakeServerStoreParts) =>
      server.sentRequests.filter(({ kind }) => kind === "getWaveformWindow");

    it("requests it again five seconds later", async () => {
      const { effects, server } = await failWindow();
      effects.clock.advanceBy(5_000);
      expect(windowRequests(server)).toHaveLength(2);
    });

    it("does not request it again sooner", async () => {
      const { effects, server } = await failWindow();
      effects.clock.advanceBy(4_999);
      expect(windowRequests(server)).toHaveLength(1);
    });
  });
});
