import { describe, expect, it } from "vitest";
import type { AppAction } from "../../app/appAction.ts";
import { actions } from "../../app/appAction.ts";
import { stateAfter } from "../../app/stateAfter.ts";
import type { MediaScreenState } from "../screenState.ts";
import { updateMediaScreen } from "./updateMediaScreen.ts";

/** Applies an action to the media screen of m1 after the given earlier actions. */
const apply = (action: AppAction, ...before: AppAction[]) => {
  const app = stateAfter(actions.openMediaFileRequested("p1", "m1"), ...before);
  return updateMediaScreen(
    app.screen.main as MediaScreenState,
    action,
    route,
    app,
  );
};

const route = { screen: "media", projectId: "p1", mediaFileId: "m1" } as const;

describe("updateMediaScreen", () => {
  it("requests the waveform windows a view wants", () => {
    const view = {
      viewStartMs: 0,
      viewEndMs: 30_000,
      focusMs: 0,
      durationMs: 30_000,
    };
    const [, effects] = apply(actions.waveformViewChanged("player", view));
    expect(effects).toContainEqual(
      expect.objectContaining({ id: "media/m1/waveform/player/0" }),
    );
  });

  it("seeks the player for seekRequested", () => {
    const [, effects] = apply(actions.seekRequested(12.5));
    expect(effects).toEqual([{ type: "seekPlayer", seconds: 12.5 }]);
  });
});
