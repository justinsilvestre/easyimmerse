import { describe, expect, it } from "vitest";
import { actions } from "../../app/appAction.ts";
import { stateAfter } from "../../app/stateAfter.ts";
import { selectDialog, selectPathPlayback } from "./playbackSelectors.ts";
import { mediaFilesListed } from "./playbackTestActions.ts";

const openM1 = actions.openMediaFileRequested("p1", "m1");

describe("playbackSelectors", () => {
  it("selectPathPlayback returns the open file's playback", () => {
    const state = { app: stateAfter(openM1, mediaFilesListed()) };
    expect(selectPathPlayback(state)?.selection).toBeNull();
  });

  it("selectPathPlayback returns null outside the media screen", () => {
    expect(selectPathPlayback({ app: stateAfter() })).toBeNull();
  });

  it("selectDialog returns the open dialog", () => {
    const state = {
      app: stateAfter(
        openM1,
        mediaFilesListed(),
        actions.trackChoiceRequested(),
      ),
    };
    expect(selectDialog(state)?.kind).toBe("trackChoice");
  });
});
