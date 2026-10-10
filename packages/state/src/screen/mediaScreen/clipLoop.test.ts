import type { AudioClip } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { actions } from "../../app/appAction.ts";
import { openWithClip } from "../../flashcards/exampleFlashcards.ts";
import { applyToMediaScreen as apply } from "./mediaScreenTestSupport.ts";

const clip: AudioClip = { start_ms: 10_000, end_ms: 12_000 };
const playing = actions.playerPlayingChanged(true);

const opened = openWithClip(clip);

describe("updateMediaScreen", () => {
  describe("for the clip loop", () => {
    it("does not loop when the player was paused as the card opened", () => {
      const [screen] = apply(playing, opened);
      expect(screen.playing.loop).toBeNull();
    });

    it("follows the clip's end as it is dragged", () => {
      const [, effects] = apply(
        actions.playerTimeChanged(10.9),
        playing,
        opened,
        actions.flashcardEdited({
          type: "clipChanged",
          clip: { start_ms: 10_000, end_ms: 10_800 },
        }),
      );
      expect(effects).toEqual([{ type: "seekPlayer", seconds: 10 }]);
    });

    it("follows the clip's start as it is dragged", () => {
      const [, effects] = apply(
        actions.playerTimeChanged(12.1),
        playing,
        opened,
        actions.flashcardEdited({
          type: "clipChanged",
          clip: { start_ms: 9_000, end_ms: 12_000 },
        }),
      );
      expect(effects).toEqual([{ type: "seekPlayer", seconds: 9 }]);
    });

    it("seeks nothing while playback stays inside the clip", () => {
      const [, effects] = apply(actions.playerTimeChanged(11), playing, opened);
      expect(effects).toEqual([]);
    });

    it("seeks back to the clip's start once playback reaches its end", () => {
      const [, effects] = apply(
        actions.playerTimeChanged(12.1),
        playing,
        opened,
      );
      expect(effects).toEqual([{ type: "seekPlayer", seconds: 10 }]);
    });

    it("keeps looping after its own seek back", () => {
      const [, effects] = apply(
        actions.playerTimeChanged(12.05),
        playing,
        opened,
        actions.playerTimeChanged(12.1),
        actions.playerSeeking(10.02),
        actions.playerTimeChanged(11),
      );
      expect(effects).toEqual([{ type: "seekPlayer", seconds: 10 }]);
    });

    it("stops looping once playback pauses", () => {
      const [screen] = apply(
        actions.playerPlayingChanged(false),
        playing,
        opened,
      );
      expect(screen.playing.loop).toBeNull();
    });

    it("stops looping once the user seeks past the clip", () => {
      const [screen] = apply(actions.seekRequested(40), playing, opened);
      expect(screen.playing.loop).toBeNull();
    });

    it("stops looping once the user seeks before the clip", () => {
      const [screen] = apply(actions.seekRequested(2), playing, opened);
      expect(screen.playing.loop).toBeNull();
    });

    it("keeps looping after the user seeks inside the clip", () => {
      const [screen] = apply(actions.seekRequested(10.5), playing, opened);
      expect(screen.playing.loop).toEqual(clip);
    });

    it("stops looping once the player starts a seek outside the clip", () => {
      const [screen] = apply(actions.playerSeeking(40), playing, opened);
      expect(screen.playing.loop).toBeNull();
    });

    it("keeps looping when the player starts a seek inside the clip", () => {
      const [screen] = apply(actions.playerSeeking(10.02), playing, opened);
      expect(screen.playing.loop).toEqual(clip);
    });

    it("keeps looping when the player reports its own seek to a start that floats cannot hold exactly", () => {
      const oddClip: AudioClip = { start_ms: 1_001, end_ms: 3_000 };
      const [screen] = apply(
        actions.playerSeeking(1.001),
        playing,
        openWithClip(oddClip),
      );
      expect(screen.playing.loop).toBe(oddClip);
    });
  });
});
