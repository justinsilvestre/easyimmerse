import type { AudioClip } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import type { AppAction } from "../../app/appAction.ts";
import { actions } from "../../app/appAction.ts";
import { stateAfter } from "../../app/stateAfter.ts";
import type { MediaScreenState } from "../screenState.ts";
import { updateClipLoop } from "./updateClipLoop.ts";

const clip: AudioClip = { start_ms: 10_000, end_ms: 12_000 };
const otherClip: AudioClip = { start_ms: 30_000, end_ms: 31_000 };
const playing = actions.playerPlayingChanged(true);
const opened = actions.editedClipOpened(clip);

/** Applies an action to the media screen of m1 after the given earlier actions. */
const apply = (action: AppAction, ...before: AppAction[]) => {
  const main = stateAfter(actions.openMediaFileRequested("p1", "m1"), ...before)
    .screen.main as MediaScreenState;
  return updateClipLoop(main, action);
};

describe("updateClipLoop", () => {
  it("seeks to the clip's start when a card opens", () => {
    const [, effects] = apply(opened, playing);
    expect(effects).toEqual([{ type: "seekPlayer", seconds: 10 }]);
  });

  it("seeks to the clip's start when a card opens while the player is paused", () => {
    const [, effects] = apply(opened);
    expect(effects).toEqual([{ type: "seekPlayer", seconds: 10 }]);
  });

  it("shows the clip's start as the current time when a card opens", () => {
    const [screen] = apply(opened);
    expect(screen.player.currentTimeSeconds).toBe(10);
  });

  it("seeks nothing for a card without a clip", () => {
    const [, effects] = apply(actions.editedClipOpened(null), playing);
    expect(effects).toEqual([]);
  });

  it("loops the clip of a card that opens while playing", () => {
    const [screen] = apply(opened, playing);
    expect(screen.loop).toEqual(clip);
  });

  it("does not loop when the player was paused as the card opened", () => {
    const [screen] = apply(playing, opened);
    expect(screen.loop).toBeNull();
  });

  it("seeks nothing while playback stays inside the clip", () => {
    const [, effects] = apply(actions.playerTimeChanged(11), playing, opened);
    expect(effects).toEqual([]);
  });

  it("seeks back to the clip's start once playback reaches its end", () => {
    const [, effects] = apply(actions.playerTimeChanged(12.1), playing, opened);
    expect(effects).toEqual([{ type: "seekPlayer", seconds: 10 }]);
  });

  it("keeps looping after its own seek back", () => {
    const [, effects] = apply(
      actions.playerTimeChanged(12.05),
      playing,
      opened,
      actions.playerTimeChanged(12.1),
      actions.playerSeeked(10.02),
      actions.playerTimeChanged(11),
    );
    expect(effects).toEqual([{ type: "seekPlayer", seconds: 10 }]);
  });

  it("follows the clip's end as it is dragged", () => {
    const [, effects] = apply(
      actions.playerTimeChanged(10.9),
      playing,
      opened,
      actions.editedClipMoved({ start_ms: 10_000, end_ms: 10_800 }),
    );
    expect(effects).toEqual([{ type: "seekPlayer", seconds: 10 }]);
  });

  it("follows the clip's start as it is dragged", () => {
    const [, effects] = apply(
      actions.playerTimeChanged(12.1),
      playing,
      opened,
      actions.editedClipMoved({ start_ms: 9_000, end_ms: 12_000 }),
    );
    expect(effects).toEqual([{ type: "seekPlayer", seconds: 9 }]);
  });

  it("does not start looping when a closed loop's clip is dragged", () => {
    const [screen] = apply(actions.editedClipMoved(clip), playing);
    expect(screen.loop).toBeNull();
  });

  it("stops looping once playback pauses", () => {
    const [screen] = apply(
      actions.playerPlayingChanged(false),
      playing,
      opened,
    );
    expect(screen.loop).toBeNull();
  });

  it("stops looping once the user seeks past the clip", () => {
    const [screen] = apply(actions.seekRequested(40), playing, opened);
    expect(screen.loop).toBeNull();
  });

  it("stops looping once the user seeks before the clip", () => {
    const [screen] = apply(actions.seekRequested(2), playing, opened);
    expect(screen.loop).toBeNull();
  });

  it("keeps looping after the user seeks inside the clip", () => {
    const [screen] = apply(actions.seekRequested(10.5), playing, opened);
    expect(screen.loop).toEqual(clip);
  });

  it("stops looping once the player reports a seek outside the clip", () => {
    const [screen] = apply(actions.playerSeeked(40), playing, opened);
    expect(screen.loop).toBeNull();
  });

  it("keeps looping when the player reports a seek inside the clip", () => {
    const [screen] = apply(actions.playerSeeked(10.02), playing, opened);
    expect(screen.loop).toEqual(clip);
  });

  it("stops looping once the card closes", () => {
    const [screen] = apply(actions.editedClipClosed(), playing, opened);
    expect(screen.loop).toBeNull();
  });

  it("loops the clip of another card that opens while playing", () => {
    const [screen] = apply(
      actions.editedClipOpened(otherClip),
      playing,
      opened,
    );
    expect(screen.loop).toEqual(otherClip);
  });
});
