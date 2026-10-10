import { describe, expect, it } from "vitest";
import { actions } from "../../app/appAction.ts";
import { stateAfter } from "../../app/stateAfter.ts";
import { openWithClip } from "../../flashcards/exampleFlashcards.ts";
import { mediaFilesListed } from "./playbackTestActions.ts";
import {
  selectRequestedWaveformSpan,
  selectWaveformRequests,
} from "./waveformSelectors.ts";

const openM1 = actions.openMediaFileRequested("p1", "m1");

describe("waveformSelectors", () => {
  it("selectRequestedWaveformSpan returns the span the user zoomed to", () => {
    const state = { app: stateAfter(openM1, actions.waveformZoomed(90_000)) };
    expect(selectRequestedWaveformSpan(state)).toBe(90_000);
  });

  it("selectWaveformRequests returns a view's window requests", () => {
    const state = {
      app: stateAfter(
        openM1,
        mediaFilesListed(),
        actions.playerDurationChanged(30),
        openWithClip({ start_ms: 1_000, end_ms: 2_000 }),
      ),
    };
    expect(selectWaveformRequests(state, "clip")).toEqual({
      0: { endMs: 30_000, status: "loading" },
    });
  });

  it("selectWaveformRequests returns none while no media screen is open", () => {
    expect(selectWaveformRequests({ app: stateAfter() }, "player")).toEqual({});
  });
});
