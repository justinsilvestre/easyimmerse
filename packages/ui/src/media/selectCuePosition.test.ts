import { actions, type ChosenWord } from "@easyimmerse/state";
import { describe, expect, it } from "vitest";
import { createTestAppStore } from "../testSupport/createTestAppStore.ts";
import { selectCuePosition } from "./selectCuePosition.ts";

const cue = { index: 1, start_ms: 0, end_ms: 1000, text: "The cat sleeps." };

/** The word "cat" of the cue, chosen with the given anchor. */
const catWith = (elementId: string): ChosenWord => ({
  word: { term: "cat", query: null },
  source: { kind: "cue", cue },
  occurrence: { passage: "1", start: 4 },
  anchor: { elementId },
});

function storeWithCursorOn(word: ChosenWord) {
  const { store } = createTestAppStore();
  store.dispatch(actions.openMediaFileRequested("p1", "m1"));
  store.dispatch(actions.lookupCursorMoved(word, "mouse"));
  return store;
}

describe("selectCuePosition", () => {
  it("places the cursor in its cue's text", () => {
    const store = storeWithCursorOn(catWith("cat"));
    expect(selectCuePosition(store.getState())).toMatchObject({
      cueIndex: 1,
      start: 4,
    });
  });

  it("keeps its answer while the cursor's place stays the same", () => {
    const store = storeWithCursorOn(catWith("cat"));
    const before = selectCuePosition(store.getState());
    store.dispatch(actions.lookupCursorMoved(catWith("other"), "mouse"));
    expect(selectCuePosition(store.getState())).toBe(before);
  });

  it("is null without a cursor", () => {
    const { store } = createTestAppStore();
    expect(selectCuePosition(store.getState())).toBeNull();
  });
});
