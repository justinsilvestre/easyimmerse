import { actions } from "@easyimmerse/state";
import { describe, expect, it } from "vitest";
import { createTestAppStore } from "../../testSupport/createTestAppStore.ts";
import { selectPlayerWaveformView } from "./selectPlayerWaveformView.ts";

/** A store with a file of the given length open, ten minutes by default, playing at the given second. */
function storeAt(currentTimeSeconds: number, durationSeconds = 600) {
  const { store } = createTestAppStore();
  store.dispatch(actions.openMediaFileRequested("p1", "m1"));
  store.dispatch(actions.playerDurationChanged(durationSeconds));
  store.dispatch(actions.playerTimeChanged(currentTimeSeconds));
  return store;
}

describe("selectPlayerWaveformView", () => {
  it("fits the span in view to the file's length", () => {
    const store = storeAt(10, 30);
    expect(selectPlayerWaveformView(store.getState()).visibleSpanMs).toBe(
      30_000,
    );
  });

  it("keeps its answer while nothing it reads changes", () => {
    const store = storeAt(300);
    const before = selectPlayerWaveformView(store.getState());
    store.dispatch(actions.cuePanelToggled());
    expect(selectPlayerWaveformView(store.getState())).toBe(before);
  });
});
