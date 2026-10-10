import { describe, expect, it } from "vitest";
import type { AppAction } from "../../app/appAction.ts";
import { actions } from "../../app/appAction.ts";
import { stateAfter } from "../../app/stateAfter.ts";
import type { MediaScreenState } from "../screenState.ts";
import { updateMediaScreen } from "./updateMediaScreen.ts";

/** Applies an action to the media screen of m1 after the given earlier actions. */
const apply = (action: AppAction, ...before: AppAction[]) => {
  const main = stateAfter(actions.openMediaFileRequested("p1", "m1"), ...before)
    .screen.main as MediaScreenState;
  return updateMediaScreen(main, action);
};

describe("updateMediaScreen", () => {
  it("stores the target as the current time for seekRequested", () => {
    const [screen] = apply(actions.seekRequested(12.5));
    expect(screen.player.currentTimeSeconds).toBe(12.5);
  });

  it("returns a seekPlayer effect for seekRequested", () => {
    const [, effects] = apply(actions.seekRequested(12.5));
    expect(effects).toEqual([{ type: "seekPlayer", seconds: 12.5 }]);
  });

  it("stores the current time for playerTimeChanged", () => {
    const [screen] = apply(actions.playerTimeChanged(3));
    expect(screen.player.currentTimeSeconds).toBe(3);
  });

  it("keeps the duration for playerTimeChanged", () => {
    const [screen] = apply(
      actions.playerTimeChanged(3),
      actions.playerDurationChanged(60),
    );
    expect(screen.player.durationSeconds).toBe(60);
  });

  it("stores the duration for playerDurationChanged", () => {
    const [screen] = apply(actions.playerDurationChanged(90));
    expect(screen.player.durationSeconds).toBe(90);
  });

  it("stores what the player has loaded for playerBufferedChanged", () => {
    const buffered = [{ startSeconds: 0, endSeconds: 30 }];
    const [screen] = apply(actions.playerBufferedChanged(buffered));
    expect(screen.player.buffered).toEqual(buffered);
  });

  it("returns no effects for playerTimeChanged", () => {
    const [, effects] = apply(actions.playerTimeChanged(3));
    expect(effects).toEqual([]);
  });

  it("returns a playPlayer effect for playRequested", () => {
    const [, effects] = apply(actions.playRequested());
    expect(effects).toEqual([{ type: "playPlayer" }]);
  });

  it("returns a pausePlayer effect for pauseRequested", () => {
    const [, effects] = apply(actions.pauseRequested());
    expect(effects).toEqual([{ type: "pausePlayer" }]);
  });

  it("returns a togglePlayer effect for playToggleRequested", () => {
    const [, effects] = apply(actions.playToggleRequested());
    expect(effects).toEqual([{ type: "togglePlayer" }]);
  });

  it("stores whether the player plays for playerPlayingChanged", () => {
    const [screen] = apply(actions.playerPlayingChanged(true));
    expect(screen.player.isPlaying).toBe(true);
  });
});
