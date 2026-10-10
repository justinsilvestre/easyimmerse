import { actions } from "@easyimmerse/state";
import { describe, expect, it } from "vitest";
import { createTestAppStore } from "../../testSupport/createTestAppStore.ts";
import { selectPlayerWaveformView } from "./selectPlayerWaveformView.ts";

/** A store with a ten-minute file open, playing at the given second. */
function storeAt(currentTimeSeconds: number) {
  const { store } = createTestAppStore();
  store.dispatch(actions.openMediaFileRequested("p1", "m1"));
  store.dispatch(actions.playerDurationChanged(600));
  store.dispatch(actions.playerTimeChanged(currentTimeSeconds));
  return store;
}

describe("selectPlayerWaveformView", () => {
  it("centres the view on the current time", () => {
    const store = storeAt(300);
    expect(
      selectPlayerWaveformView(store.getState()).windowView.viewStartMs,
    ).toBe(270_000);
  });

  it("keeps the view inside the file at its end", () => {
    const store = storeAt(599);
    expect(
      selectPlayerWaveformView(store.getState()).windowView.viewEndMs,
    ).toBe(600_000);
  });

  it("keeps its answer while nothing it reads changes", () => {
    const store = storeAt(300);
    const before = selectPlayerWaveformView(store.getState());
    store.dispatch(actions.cuePanelToggled());
    expect(selectPlayerWaveformView(store.getState())).toBe(before);
  });
});
