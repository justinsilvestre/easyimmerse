import { describe, expect, it } from "vitest";
import {
  closedSourceMedia,
  type SourceMediaEvent,
  sourceMediaReducer,
} from "./sourceMediaReducer.ts";

const stateAfter = (...events: SourceMediaEvent[]) =>
  events.reduce(sourceMediaReducer, closedSourceMedia);

describe("sourceMediaReducer", () => {
  it("stays open when changes sent during an earlier opening are applied", () => {
    const state = stateAfter(
      { type: "opened" },
      { type: "stepSent" },
      { type: "closed" },
      { type: "opened" },
      { type: "applied", opening: 1 },
    );
    expect(state.isOpen).toBe(true);
  });

  it("closes when changes sent during the current opening are applied", () => {
    const state = stateAfter(
      { type: "opened" },
      { type: "stepSent" },
      { type: "applied", opening: 1 },
    );
    expect(state.isOpen).toBe(false);
  });

  it("keeps counting openings after it closes", () => {
    const state = stateAfter({ type: "opened" }, { type: "closed" });
    expect(state.opening).toBe(1);
  });
});
