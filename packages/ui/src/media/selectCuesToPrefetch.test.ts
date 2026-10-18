import { actions } from "@easyimmerse/state";
import { describe, expect, it } from "vitest";
import { createTestAppStore } from "../testSupport/createTestAppStore.ts";
import { exampleCues } from "./exampleCues.ts";
import { selectCuesToPrefetch } from "./selectCuesToPrefetch.ts";

function storeAt(currentTimeSeconds: number) {
  const { store } = createTestAppStore();
  store.dispatch(actions.openMediaFileRequested("p1", "m1"));
  store.dispatch(actions.playerTimeChanged(currentTimeSeconds));
  return store;
}

describe("selectCuesToPrefetch", () => {
  it("keeps its answer while the player's time moves within a cue", () => {
    const store = storeAt(6.2);
    const before = selectCuesToPrefetch(store.getState(), exampleCues);
    store.dispatch(actions.playerTimeChanged(6.3));
    expect(selectCuesToPrefetch(store.getState(), exampleCues)).toBe(before);
  });

  it("drops the first cue once the player's time has passed it", () => {
    const store = storeAt(0);
    const before = selectCuesToPrefetch(store.getState(), exampleCues);
    store.dispatch(actions.playerTimeChanged(6));
    expect(selectCuesToPrefetch(store.getState(), exampleCues)).not.toContain(
      before[0],
    );
  });
});
