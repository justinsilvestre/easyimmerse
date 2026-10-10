import type { AudioClip } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import type { AppAction } from "../../app/appAction.ts";
import { actions } from "../../app/appAction.ts";
import { stateAfter } from "../../app/stateAfter.ts";
import { openWithClip } from "../../flashcards/exampleFlashcards.ts";
import type { MediaScreenState } from "../screenState.ts";
import { updateClipPlayback } from "./updateClipPlayback.ts";
import { updatePlayer } from "./updatePlayer.ts";

const clip: AudioClip = { start_ms: 1_750, end_ms: 3_000 };
const otherClip: AudioClip = { start_ms: 30_000, end_ms: 31_000 };
const requested = actions.clipPlayRequested(clip);
const playing = actions.playerPlayingChanged(true);

/** Applies an action to the media screen of m1 after the given earlier actions, once the player has recorded it, as in `updateMediaScreen`. */
const apply = (action: AppAction, ...before: AppAction[]) => {
  const main = stateAfter(actions.openMediaFileRequested("p1", "m1"), ...before)
    .screen.main as MediaScreenState;
  const [recorded] = updatePlayer(main, action);
  return updateClipPlayback(recorded, action);
};

/** Returns what the player is asked to do when it reports a time after the given earlier actions. */
const effectsAt = (seconds: number, ...before: AppAction[]) =>
  apply(actions.playerTimeChanged(seconds), ...before)[1];

describe("updateClipPlayback", () => {
  it("seeks to the clip's start and then plays for clipPlayRequested", () => {
    const [, effects] = apply(requested);
    expect(effects).toEqual([
      { type: "seekPlayer", seconds: 1.75 },
      { type: "playPlayer" },
    ]);
  });

  it("shows the clip's start as the current time for clipPlayRequested", () => {
    const [screen] = apply(requested);
    expect(screen.player.currentTimeSeconds).toBe(1.75);
  });

  it("pauses the player once playback reaches the clip's end", () => {
    expect(effectsAt(3.1, requested, playing)).toEqual([
      { type: "pausePlayer" },
    ]);
  });

  it("pauses the player once a player that was not yet playing reaches the clip's end", () => {
    expect(effectsAt(3.1, requested)).toEqual([{ type: "pausePlayer" }]);
  });

  it("leaves playback alone before the clip's end", () => {
    expect(effectsAt(2.5, requested, playing)).toEqual([]);
  });

  it("pauses only once", () => {
    expect(
      effectsAt(3.2, requested, playing, actions.playerTimeChanged(3.1)),
    ).toEqual([]);
  });

  it("leaves playback alone once the user has moved away from the clip", () => {
    expect(
      effectsAt(3.1, requested, playing, actions.playerTimeChanged(12)),
    ).toEqual([]);
  });

  it("leaves playback alone once the user has moved to well before the clip", () => {
    expect(
      effectsAt(3.1, requested, playing, actions.playerTimeChanged(1)),
    ).toEqual([]);
  });

  it("keeps the clip while the player reports a time just before its start", () => {
    expect(
      effectsAt(3.1, requested, playing, actions.playerTimeChanged(1.6)),
    ).toEqual([{ type: "pausePlayer" }]);
  });

  it("leaves playback alone once the user has paused it", () => {
    expect(
      effectsAt(
        3.1,
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

  it("asks nothing of the player before Play is pressed", () => {
    expect(effectsAt(3.1, playing)).toEqual([]);
  });
});
