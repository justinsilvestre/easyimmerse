import { type AppAction, actions } from "@easyimmerse/state";
import { describe, expect, it } from "vitest";
import { createTestAppStore } from "../testSupport/createTestAppStore.ts";
import { exampleShortBook } from "./exampleDocuments.ts";
import { selectNearbySentences } from "./selectNearbySentences.ts";

function stateAfter(...dispatched: AppAction[]) {
  const { store } = createTestAppStore();
  for (const action of dispatched) store.dispatch(action);
  return store.getState();
}

const opened = actions.openMediaFileRequested("p1", "b1");

describe("selectNearbySentences", () => {
  it("takes the sentences of the location's paragraph before a span is measured", () => {
    const state = stateAfter(opened);
    expect(selectNearbySentences(state, exampleShortBook, "b1", "en")).toEqual([
      "The cat is sleeping on the windowsill.",
    ]);
  });

  it("takes the sentences of the measured span", () => {
    const state = stateAfter(
      opened,
      actions.readerNearSpanMeasured({ first: 0, last: 1 }),
    );
    expect(selectNearbySentences(state, exampleShortBook, "b1", "en")).toEqual([
      "The cat is sleeping on the windowsill.",
      "The dog wants to eat, and it is hungry.",
    ]);
  });

  it("returns the same sentences when neither the place nor the span has moved", () => {
    const state = stateAfter(opened);
    const first = selectNearbySentences(state, exampleShortBook, "b1", "en");
    const later = stateAfter(opened, actions.readerChromeToggled());
    expect(selectNearbySentences(later, exampleShortBook, "b1", "en")).toBe(
      first,
    );
  });
});
