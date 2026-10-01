import { describe, expect, it } from "vitest";
import { actions } from "../actions.ts";
import { initialAppState } from "../appState.ts";
import { createAppState } from "../testSupport/createAppState.ts";
import { update } from "../update.ts";

const mediaScreenState = (mediaId: string) =>
  createAppState({}, { screen: { kind: "media", projectId: "p1", mediaId } });

describe("update", () => {
  it("stores the current time for playerTimeChanged", () => {
    const [state] = update(initialAppState, actions.playerTimeChanged(3000));
    expect(state.player.currentTimeMs).toBe(3000);
  });

  it("returns no effects for playerTimeChanged", () => {
    const [, effects] = update(initialAppState, actions.playerTimeChanged(3));
    expect(effects).toEqual([]);
  });

  it("stores the duration for playerDurationKnown", () => {
    const [state] = update(initialAppState, actions.playerDurationKnown(9000));
    expect(state.player.durationMs).toBe(9000);
  });

  it("stores whether the media plays for playerPlayingChanged", () => {
    const [state] = update(initialAppState, actions.playerPlayingChanged(true));
    expect(state.player.playing).toBe(true);
  });

  it("returns a playPlayer effect for playRequested", () => {
    const [, effects] = update(initialAppState, actions.playRequested());
    expect(effects).toEqual([{ type: "playPlayer" }]);
  });

  it("returns a pausePlayer effect for pauseRequested", () => {
    const [, effects] = update(initialAppState, actions.pauseRequested());
    expect(effects).toEqual([{ type: "pausePlayer" }]);
  });

  it("returns a playPlayer effect for togglePlayRequested while paused", () => {
    const [, effects] = update(initialAppState, actions.togglePlayRequested());
    expect(effects).toEqual([{ type: "playPlayer" }]);
  });

  it("returns a pausePlayer effect for togglePlayRequested while playing", () => {
    const playing = createAppState({ playing: true });
    const [, effects] = update(playing, actions.togglePlayRequested());
    expect(effects).toEqual([{ type: "pausePlayer" }]);
  });

  it("leaves state unchanged for seekRequested", () => {
    const [state] = update(initialAppState, actions.seekRequested(12_500));
    expect(state).toBe(initialAppState);
  });

  it("returns a seekPlayer effect for seekRequested", () => {
    const [, effects] = update(initialAppState, actions.seekRequested(12_500));
    expect(effects).toEqual([{ type: "seekPlayer", ms: 12_500 }]);
  });

  describe("when skipping", () => {
    const at = (currentTimeMs: number, durationMs: number | null) =>
      createAppState({ currentTimeMs, durationMs });

    it("seeks by the delta from the current time", () => {
      const [, effects] = update(at(5000, 9000), actions.skipRequested(-2000));
      expect(effects).toEqual([{ type: "seekPlayer", ms: 3000 }]);
    });

    it("stops at the start", () => {
      const [, effects] = update(at(1000, 9000), actions.skipRequested(-2000));
      expect(effects).toEqual([{ type: "seekPlayer", ms: 0 }]);
    });

    it("stops at the end", () => {
      const [, effects] = update(at(8000, 9000), actions.skipRequested(2000));
      expect(effects).toEqual([{ type: "seekPlayer", ms: 9000 }]);
    });

    it("has no end while the duration is unknown", () => {
      const [, effects] = update(at(8000, null), actions.skipRequested(2000));
      expect(effects).toEqual([{ type: "seekPlayer", ms: 10_000 }]);
    });
  });

  it("stores the rate for playbackRateChanged", () => {
    const [state] = update(initialAppState, actions.playbackRateChanged(0.75));
    expect(state.player.playbackRate).toBe(0.75);
  });

  it("returns a setPlaybackRate effect for playbackRateChanged", () => {
    const [, effects] = update(
      initialAppState,
      actions.playbackRateChanged(0.75),
    );
    expect(effects).toEqual([{ type: "setPlaybackRate", rate: 0.75 }]);
  });

  it("stores the volume for volumeChanged", () => {
    const [state] = update(initialAppState, actions.volumeChanged(0.5));
    expect(state.player.volume).toBe(0.5);
  });

  it("returns a setVolume effect limited to 1 for volumeChanged", () => {
    const [, effects] = update(initialAppState, actions.volumeChanged(1.5));
    expect(effects).toEqual([{ type: "setVolume", volume: 1 }]);
  });

  it("stores the range for loopRequested", () => {
    const range = { start_ms: 1000, end_ms: 2000 };
    const [state] = update(initialAppState, actions.loopRequested(range));
    expect(state.player.loop).toEqual(range);
  });

  it("returns a setPlayerLoop effect for loopRequested", () => {
    const [, effects] = update(initialAppState, actions.loopRequested(null));
    expect(effects).toEqual([{ type: "setPlayerLoop", range: null }]);
  });

  describe("when the media is open", () => {
    it("stores the URL for mediaUrlResolved", () => {
      const [state] = update(
        mediaScreenState("m1"),
        actions.mediaUrlResolved("m1", "blob:x"),
      );
      expect(state.player.mediaUrl).toBe("blob:x");
    });

    it("stores the message for mediaUrlFailed", () => {
      const [state] = update(
        mediaScreenState("m1"),
        actions.mediaUrlFailed("m1", "gone"),
      );
      expect(state.player.mediaUrlError).toBe("gone");
    });
  });

  describe("when other media is open", () => {
    it("ignores mediaUrlResolved", () => {
      const before = mediaScreenState("m2");
      const [state] = update(before, actions.mediaUrlResolved("m1", "blob:x"));
      expect(state).toBe(before);
    });

    it("ignores mediaUrlFailed", () => {
      const before = mediaScreenState("m2");
      const [state] = update(before, actions.mediaUrlFailed("m1", "gone"));
      expect(state).toBe(before);
    });
  });
});
