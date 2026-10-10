import { describe, expect, it } from "vitest";
import { actions } from "../../app/appAction.ts";
import { stateAfter } from "../../app/stateAfter.ts";
import {
  selectRequestedWaveformSpan,
  selectWaveformRequests,
} from "./waveformSelectors.ts";

const openM1 = actions.openMediaFileRequested("p1", "m1");

const view = {
  viewStartMs: 0,
  viewEndMs: 30_000,
  focusMs: 0,
  durationMs: 30_000,
};

describe("waveformSelectors", () => {
  it("selectRequestedWaveformSpan returns the span the user zoomed to", () => {
    const state = { app: stateAfter(openM1, actions.waveformZoomed(90_000)) };
    expect(selectRequestedWaveformSpan(state)).toBe(90_000);
  });

  it("selectWaveformRequests returns a view's window requests", () => {
    const changed = actions.waveformViewChanged("clip", view);
    const state = { app: stateAfter(openM1, changed) };
    expect(selectWaveformRequests(state, "clip")).toEqual({
      0: { endMs: 30_000, status: "loading" },
    });
  });

  it("selectWaveformRequests returns none while no media screen is open", () => {
    expect(selectWaveformRequests({ app: stateAfter() }, "player")).toEqual({});
  });
});
