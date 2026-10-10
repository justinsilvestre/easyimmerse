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

  it("pauses the player at the end of a clip played with its Play button", () => {
    const clip = { start_ms: 1_750, end_ms: 3_000 };
    const [, effects] = apply(
      actions.playerTimeChanged(3.1),
      actions.clipPlayRequested(clip),
    );
    expect(effects).toEqual([{ type: "pausePlayer" }]);
  });

  it("shows the waveform for waveformToggled", () => {
    const [screen] = apply(actions.waveformToggled());
    expect(screen.panels.waveform).toBe(true);
  });

  it("pauses nothing when Play is pressed while the clip loops and playback reaches its end", () => {
    const clip = { start_ms: 1_750, end_ms: 3_000 };
    const [, effects] = apply(
      actions.playerTimeChanged(3.1),
      actions.playerPlayingChanged(true),
      actions.editedClipOpened(clip),
      actions.clipPlayRequested(clip),
    );
    expect(effects).not.toContainEqual({ type: "pausePlayer" });
  });

  it("seeks the player for seekRequested", () => {
    const [, effects] = apply(actions.seekRequested(12.5));
    expect(effects).toEqual([{ type: "seekPlayer", seconds: 12.5 }]);
  });
});
