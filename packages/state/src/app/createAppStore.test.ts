import type { StoreEnhancer } from "redux";
import { describe, expect, it } from "vitest";
import { selectNotices } from "../notices/noticesSelectors.ts";
import { createRecordingEffects } from "../platform/recordingEffects.ts";
import { actions } from "./appAction.ts";
import { createAppStore } from "./createAppStore.ts";
import { createFakeServerStoreParts } from "./createFakeServerStoreParts.ts";
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
});
