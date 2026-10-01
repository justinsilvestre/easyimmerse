import { describe, expect, it } from "vitest";
import { actions } from "./actions.ts";
import { initialAppState } from "./appState.ts";
import { createAppStore } from "./createAppStore.ts";
import { createFakeServerStoreParts } from "./createFakeServerStoreParts.ts";
import { createRecordingEffects } from "./recordingEffects.ts";

describe("createAppStore", () => {
  it("starts the app slice at the initial app state", () => {
    const store = createAppStore(
      createRecordingEffects(),
      createFakeServerStoreParts(),
    );
    expect(store.getState().app).toEqual(initialAppState);
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
});
