import type { AudioClip } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { actions } from "../../app/appAction.ts";
import { dispatch } from "../../app/dispatchEffect.ts";
import { openWithClip } from "../../flashcards/exampleFlashcards.ts";
import {
  applyToMediaScreen as apply,
  mediaScreenAfter,
} from "./mediaScreenTestSupport.ts";
import { loopClipOf, playedClipOf } from "./playingState.ts";

const clip: AudioClip = { start_ms: 10_000, end_ms: 12_000 };
const otherClip: AudioClip = { start_ms: 30_000, end_ms: 31_000 };
const playing = actions.playerPlayingChanged(true);
const opened = openWithClip(clip);
const announced = actions.flashcardFormOpened;

describe("updateMediaScreen", () => {
  describe("for the flashcard form", () => {
    it("keeps the card the form opens", () => {
      const [screen] = apply(opened);
      expect(screen.flashcardForm?.card).toMatchObject({
        flashcardId: "f-clip",
      });
    });

    it("announces the clip of the card it opens", () => {
      const [, effects] = apply(opened);
      expect(effects).toContainEqual(dispatch(announced(clip)));
    });

    it("seeks to the clip's start when a card opens", () => {
      const [, effects] = apply(announced(clip), playing);
      expect(effects).toEqual([{ type: "seekPlayer", seconds: 10 }]);
    });

    it("seeks to the clip's start when a card opens while the player is paused", () => {
      const [, effects] = apply(announced(clip));
      expect(effects).toEqual([{ type: "seekPlayer", seconds: 10 }]);
    });

    it("shows the clip's start as the current time when a card opens", () => {
      const [screen] = apply(announced(clip));
      expect(screen.playing.player.currentTimeSeconds).toBe(10);
    });

    it("seeks nothing for a card without a clip", () => {
      const [, effects] = apply(announced(null), playing);
      expect(effects).toEqual([]);
    });

    it("loops the clip of a card that opens while playing", () => {
      const { screen } = mediaScreenAfter(playing, opened);
      expect(loopClipOf(screen)).toEqual(clip);
    });

    it("does not start looping when the clip of a card that does not loop is dragged", () => {
      const [screen] = apply(
        actions.flashcardEdited({ type: "clipChanged", clip: otherClip }),
        opened,
      );
      expect(loopClipOf(screen)).toBeNull();
    });

    it("stops looping once the card closes", () => {
      const [screen] = apply(actions.flashcardClosed(), playing, opened);
      expect(loopClipOf(screen)).toBeNull();
    });

    it("forgets the clip Play once the card closes", () => {
      const [screen] = apply(
        actions.flashcardClosed(),
        opened,
        actions.clipPlayRequested(clip),
      );
      expect(playedClipOf(screen)).toBeNull();
    });

    it("seeks to another card's clip start when it opens while playing", () => {
      const [, effects] = apply(announced(otherClip), playing, opened);
      expect(effects).toEqual([{ type: "seekPlayer", seconds: 30 }]);
    });

    it("loops the clip of another card that opens while playing", () => {
      const { screen } = mediaScreenAfter(
        playing,
        opened,
        openWithClip(otherClip),
      );
      expect(loopClipOf(screen)).toEqual(otherClip);
    });
  });
});
