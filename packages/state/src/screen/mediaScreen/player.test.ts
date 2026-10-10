import { describe, expect, it } from "vitest";
import { actions } from "../../app/appAction.ts";
import { applyToMediaScreen as apply } from "./mediaScreenTestSupport.ts";

describe("updateMediaScreen", () => {
  describe("for the player", () => {
    it("stores the target as the current time for seekRequested", () => {
      const [screen] = apply(actions.seekRequested(12.5));
      expect(screen.playing.player.currentTimeSeconds).toBe(12.5);
    });

    it("returns a seekPlayer effect for seekRequested", () => {
      const [, effects] = apply(actions.seekRequested(12.5));
      expect(effects).toEqual([{ type: "seekPlayer", seconds: 12.5 }]);
    });

    it("records the seek target for seekRequested", () => {
      const [screen] = apply(actions.seekRequested(12.5));
      expect(screen.playing.player.lastSeekSeconds).toBe(12.5);
    });

    it("records the seek target for playerSeeking", () => {
      const [screen] = apply(actions.playerSeeking(4));
      expect(screen.playing.player.lastSeekSeconds).toBe(4);
    });

    it("records the failure on a source for playerFailed", () => {
      const [screen] = apply(actions.playerFailed("a.mp4", "It is damaged."));
      expect(screen.playing.player.failure).toEqual({
        url: "a.mp4",
        cause: "It is damaged.",
      });
    });

    it("stores the current time for playerTimeChanged", () => {
      const [screen] = apply(actions.playerTimeChanged(3));
      expect(screen.playing.player.currentTimeSeconds).toBe(3);
    });

    it("keeps the duration for playerTimeChanged", () => {
      const [screen] = apply(
        actions.playerTimeChanged(3),
        actions.playerDurationChanged(60),
      );
      expect(screen.playing.player.durationSeconds).toBe(60);
    });

    it("stores the duration for playerDurationChanged", () => {
      const [screen] = apply(actions.playerDurationChanged(90));
      expect(screen.playing.player.durationSeconds).toBe(90);
    });

    it("stores what the player has loaded for playerBufferedChanged", () => {
      const buffered = [{ startSeconds: 0, endSeconds: 30 }];
      const [screen] = apply(actions.playerBufferedChanged(buffered));
      expect(screen.playing.player.buffered).toEqual(buffered);
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
      expect(screen.playing.player.isPlaying).toBe(true);
    });
  });
});
