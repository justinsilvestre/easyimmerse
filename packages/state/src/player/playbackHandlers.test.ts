import { describe, expect, it } from "vitest";
import { actions } from "../actions.ts";
import type { AppState } from "../appState.ts";
import { createAppState } from "../testSupport/createAppState.ts";
import { update } from "../update.ts";
import type { MediaPlayback } from "./mediaPlayback.ts";
import type { PlayerState } from "./playerState.ts";

const direct: MediaPlayback = { kind: "direct", url: "blob:x" };
const converted: MediaPlayback = {
  kind: "hls",
  url: "http://127.0.0.1:8787/conversions/k1/index.m3u8",
  token: "secret",
};

const mediaScreenState = (
  mediaId: string,
  player: Partial<PlayerState> = {},
  preferences: AppState["preferences"] = {},
) =>
  createAppState(player, {
    screen: { kind: "media", projectId: "p1", mediaId },
    preferences,
  });

const heldState = () => mediaScreenState("m1", { heldPlayback: converted });

describe("update", () => {
  describe("when the media is open", () => {
    it("gives a direct playback to the player for mediaPlaybackResolved", () => {
      const [state] = update(
        mediaScreenState("m1"),
        actions.mediaPlaybackResolved("m1", direct),
      );
      expect(state.player.playback).toEqual(direct);
    });

    it("holds a converted playback for mediaPlaybackResolved", () => {
      const [state] = update(
        mediaScreenState("m1"),
        actions.mediaPlaybackResolved("m1", converted),
      );
      expect(state.player.heldPlayback).toEqual(converted);
    });

    it("gives the player nothing to load while a converted playback is held", () => {
      const [state] = update(
        mediaScreenState("m1"),
        actions.mediaPlaybackResolved("m1", converted),
      );
      expect(state.player.playback).toBeNull();
    });

    it("gives a converted playback to the player for mediaPlaybackResolved once the notice is dismissed", () => {
      const dismissed = { conversionNoticeDismissed: "true" };
      const [state] = update(
        mediaScreenState("m1", {}, dismissed),
        actions.mediaPlaybackResolved("m1", converted),
      );
      expect(state.player.playback).toEqual(converted);
    });

    it("stores the message for mediaPlaybackFailed", () => {
      const [state] = update(
        mediaScreenState("m1"),
        actions.mediaPlaybackFailed("m1", "gone"),
      );
      expect(state.player.playbackError).toBe("gone");
    });
  });

  it("stores the message for playerPlaybackFailed", () => {
    const before = mediaScreenState("m1", { playback: converted });
    const [state] = update(before, actions.playerPlaybackFailed("stalled"));
    expect(state.player.playbackError).toBe("stalled");
  });

  describe("when other media is open", () => {
    it("ignores mediaPlaybackResolved", () => {
      const before = mediaScreenState("m2");
      const [state] = update(
        before,
        actions.mediaPlaybackResolved("m1", direct),
      );
      expect(state).toBe(before);
    });

    it("ignores mediaPlaybackFailed", () => {
      const before = mediaScreenState("m2");
      const [state] = update(before, actions.mediaPlaybackFailed("m1", "gone"));
      expect(state).toBe(before);
    });
  });

  describe("while a playback is held", () => {
    it("gives the held playback to the player for conversionNoticeConfirmed", () => {
      const [state] = update(
        heldState(),
        actions.conversionNoticeConfirmed(false),
      );
      expect(state.player.playback).toEqual(converted);
    });

    it("releases the hold for conversionNoticeConfirmed", () => {
      const [state] = update(
        heldState(),
        actions.conversionNoticeConfirmed(false),
      );
      expect(state.player.heldPlayback).toBeNull();
    });

    it("returns no effects for conversionNoticeConfirmed when the notice may show again", () => {
      const [, effects] = update(
        heldState(),
        actions.conversionNoticeConfirmed(false),
      );
      expect(effects).toEqual([]);
    });

    it("records the dismissal for conversionNoticeConfirmed when the notice should not show again", () => {
      const [state] = update(
        heldState(),
        actions.conversionNoticeConfirmed(true),
      );
      expect(state.preferences.conversionNoticeDismissed).toBe("true");
    });

    it("saves the dismissal for conversionNoticeConfirmed when the notice should not show again", () => {
      const [, effects] = update(
        heldState(),
        actions.conversionNoticeConfirmed(true),
      );
      expect(effects).toEqual([
        {
          type: "savePreference",
          key: "conversionNoticeDismissed",
          value: "true",
        },
      ]);
    });
  });

  describe("while no playback is held", () => {
    it("leaves state unchanged for conversionNoticeConfirmed", () => {
      const before = mediaScreenState("m1", { playback: direct });
      const [state] = update(before, actions.conversionNoticeConfirmed(true));
      expect(state).toBe(before);
    });
  });
});
