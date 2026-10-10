import type { AudioClip } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import type { AppAction } from "../../app/appAction.ts";
import { actions } from "../../app/appAction.ts";
import { openWithClip } from "../../flashcards/exampleFlashcards.ts";
import { applyToMediaScreen as apply } from "./mediaScreenTestSupport.ts";

const clip: AudioClip = { start_ms: 1_750, end_ms: 3_000 };
const otherClip: AudioClip = { start_ms: 30_000, end_ms: 31_000 };
const requested = actions.clipPlayRequested(clip);
const playing = actions.playerPlayingChanged(true);
/** The card whose clip the editor's Play button plays. */
const opened = openWithClip(clip);

/** Returns what the player is asked to do when it reports a time after the given earlier actions. */
const effectsAt = (seconds: number, ...before: AppAction[]) =>
  apply(actions.playerTimeChanged(seconds), ...before)[1];

describe("updateMediaScreen", () => {
  describe("for the clip Play", () => {
    it("seeks to the clip's start and then plays for clipPlayRequested", () => {
      const [, effects] = apply(requested);
      expect(effects).toEqual([
        { type: "seekPlayer", seconds: 1.75 },
        { type: "playPlayer" },
      ]);
    });

    it("shows the clip's start as the current time for clipPlayRequested", () => {
      const [screen] = apply(requested);
      expect(screen.playing.player.currentTimeSeconds).toBe(1.75);
    });

    it("pauses the player once playback reaches the clip's end", () => {
      expect(effectsAt(3.1, opened, requested, playing)).toEqual([
        { type: "pausePlayer" },
      ]);
    });

    it("pauses the player once a player that was not yet playing reaches the clip's end", () => {
      expect(effectsAt(3.1, opened, requested)).toEqual([
        { type: "pausePlayer" },
      ]);
    });

    it("leaves playback alone before the clip's end", () => {
      expect(effectsAt(2.5, opened, requested, playing)).toEqual([]);
    });

    it("pauses only once", () => {
      expect(
        effectsAt(
          3.2,
          opened,
          requested,
          playing,
          actions.playerTimeChanged(3.1),
        ),
      ).toEqual([]);
    });

    it("leaves playback alone once the user has moved away from the clip", () => {
      expect(
        effectsAt(
          3.1,
          opened,
          requested,
          playing,
          actions.playerTimeChanged(12),
        ),
      ).toEqual([]);
    });

    it("leaves playback alone once the user has moved to well before the clip", () => {
      expect(
        effectsAt(
          3.1,
          opened,
          requested,
          playing,
          actions.playerTimeChanged(1),
        ),
      ).toEqual([]);
    });

    it("keeps the clip while the player reports a time just before its start", () => {
      expect(
        effectsAt(
          3.1,
          opened,
          requested,
          playing,
          actions.playerTimeChanged(1.6),
        ),
      ).toEqual([{ type: "pausePlayer" }]);
    });

    it("leaves playback alone once the user has paused it", () => {
      expect(
        effectsAt(
          3.1,
          opened,
          requested,
          playing,
          actions.playerPlayingChanged(false),
          playing,
        ),
      ).toEqual([]);
    });

    it("waits for the moved clip's end", () => {
      const moved = actions.flashcardEdited({
        type: "clipChanged",
        clip: { start_ms: 1_750, end_ms: 4_000 },
      });
      expect(
        effectsAt(3.1, openWithClip(clip), requested, playing, moved),
      ).toEqual([]);
    });

    it("leaves playback alone once the card closes", () => {
      expect(
        effectsAt(
          3.1,
          openWithClip(clip),
          requested,
          playing,
          actions.flashcardClosed(),
        ),
      ).toEqual([]);
    });

    it("leaves playback alone once another card opens", () => {
      expect(
        effectsAt(
          3.1,
          openWithClip(clip),
          requested,
          playing,
          openWithClip(otherClip),
        ),
      ).toEqual([]);
    });

    it("pauses nothing when Play is pressed while the clip loops and playback reaches its end", () => {
      expect(
        effectsAt(3.1, playing, openWithClip(clip), requested),
      ).not.toContainEqual({ type: "pausePlayer" });
    });

    it("asks nothing of the player before Play is pressed", () => {
      expect(effectsAt(3.1, playing)).toEqual([]);
    });
  });
});
