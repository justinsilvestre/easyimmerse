import { actions } from "@easyimmerse/state";
import { describe, expect, it } from "vitest";
import { createTestAppStore } from "../testSupport/createTestAppStore.ts";
import { selectMediaPlayback } from "./selectMediaPlayback.ts";

function storeAt(currentTimeSeconds: number) {
  const { store } = createTestAppStore();
  store.dispatch(actions.openMediaFileRequested("p1", "m1"));
  store.dispatch(actions.playerTimeChanged(currentTimeSeconds));
  return store;
}

describe("selectMediaPlayback", () => {
  it("gives the player's time in milliseconds", () => {
    const store = storeAt(3);
    expect(selectMediaPlayback(store.getState()).currentMs).toBe(3000);
  });

  it("keeps its answer while nothing it reads changes", () => {
    const store = storeAt(3);
    const before = selectMediaPlayback(store.getState());
    store.dispatch(actions.cuePanelToggled());
    expect(selectMediaPlayback(store.getState())).toBe(before);
  });
});
