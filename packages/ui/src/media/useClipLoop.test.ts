import type { AudioClip } from "@easyimmerse/types";
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { type LoopedPlayer, useClipLoop } from "./useClipLoop.ts";

afterEach(cleanup);

const clip: AudioClip = { start_ms: 10_000, end_ms: 12_000 };
const otherClip: AudioClip = { start_ms: 30_000, end_ms: 31_000 };
const firstOpening = Symbol("first opening");
const secondOpening = Symbol("second opening");

type Props = {
  opening: unknown;
  clip: AudioClip | null;
  player: LoopedPlayer;
};

/**
 * Renders the hook with no card open, the player at `currentMs`, recording the seeks it asks for.
 * Each seek moves the player there, as the store does, at the next `update`.
 */
function renderLoop({ isPlaying = true, currentMs = 5_000 } = {}) {
  const seeks: number[] = [];
  let props: Props = {
    opening: null,
    clip: null,
    player: { isPlaying, currentMs },
  };
  const rendered = renderHook(
    (current: Props) =>
      useClipLoop(current.opening, current.clip, current.player, (ms) =>
        seeks.push(ms),
      ),
    { initialProps: props },
  );
  const update = (changes: Partial<Props>) => {
    props = { ...props, ...changes };
    rendered.rerender(props);
  };
  /** Moves the player to `currentMs`, as a time update or a seek would. */
  const playTo = (currentMs: number) =>
    update({ player: { ...props.player, currentMs } });
  const open = (opening: unknown, opened: AudioClip | null = clip) => {
    update({ opening, clip: opened });
    // The store moves the player to the seek's time at once.
    const seeked = seeks.at(-1);
    if (opened && seeked !== undefined) playTo(seeked);
  };
  const pause = () => update({ player: { ...props.player, isPlaying: false } });
  return { seeks, update, playTo, open, pause };
}

describe("useClipLoop", () => {
  it("seeks to the clip's start when a card opens", () => {
    const { seeks, open } = renderLoop();
    open(firstOpening);
    expect(seeks).toEqual([10_000]);
  });

  it("seeks to the clip's start when a card opens while the player is paused", () => {
    const { seeks, open } = renderLoop({ isPlaying: false });
    open(firstOpening);
    expect(seeks).toEqual([10_000]);
  });

  it("seeks nothing for a card without a clip", () => {
    const { seeks, open } = renderLoop();
    open(firstOpening, null);
    expect(seeks).toEqual([]);
  });

  it("seeks only once while the same card stays open", () => {
    const { seeks, open, playTo } = renderLoop();
    open(firstOpening);
    playTo(10_250);
    playTo(10_500);
    expect(seeks).toEqual([10_000]);
  });

  it("seeks to another card's clip start when it opens", () => {
    const { seeks, open } = renderLoop();
    open(firstOpening);
    open(secondOpening, otherClip);
    expect(seeks).toEqual([10_000, 30_000]);
  });

  it("seeks back to the clip's start once playback reaches its end", () => {
    const { seeks, open, playTo } = renderLoop();
    open(firstOpening);
    playTo(11_000);
    playTo(12_100);
    expect(seeks).toEqual([10_000, 10_000]);
  });

  it("keeps looping after its own seek back", () => {
    const { seeks, open, playTo } = renderLoop();
    open(firstOpening);
    playTo(11_000);
    playTo(12_100);
    playTo(10_000);
    playTo(11_000);
    playTo(12_050);
    expect(seeks).toEqual([10_000, 10_000, 10_000]);
  });

  it("does not loop when the player was paused as the card opened", () => {
    const { seeks, open, playTo, update } = renderLoop({ isPlaying: false });
    open(firstOpening);
    update({ player: { isPlaying: true, currentMs: 10_000 } });
    playTo(11_000);
    playTo(12_100);
    expect(seeks).toEqual([10_000]);
  });

  it("follows the clip's end as it is dragged", () => {
    const { seeks, open, playTo, update } = renderLoop();
    open(firstOpening);
    playTo(10_500);
    update({ clip: { start_ms: 10_000, end_ms: 10_800 } });
    playTo(10_900);
    expect(seeks).toEqual([10_000, 10_000]);
  });

  it("follows the clip's start as it is dragged", () => {
    const { seeks, open, playTo, update } = renderLoop();
    open(firstOpening);
    update({ clip: { start_ms: 9_000, end_ms: 12_000 } });
    playTo(11_000);
    playTo(12_100);
    expect(seeks).toEqual([10_000, 9_000]);
  });

  it("stops looping once playback pauses", () => {
    const { seeks, open, playTo, pause, update } = renderLoop();
    open(firstOpening);
    playTo(11_000);
    pause();
    update({ player: { isPlaying: true, currentMs: 11_000 } });
    playTo(12_100);
    expect(seeks).toEqual([10_000]);
  });

  it("stops looping once the user seeks past the clip", () => {
    const { seeks, open, playTo } = renderLoop();
    open(firstOpening);
    playTo(11_000);
    playTo(40_000);
    playTo(12_100);
    expect(seeks).toEqual([10_000]);
  });

  it("stops looping once the user seeks before the clip", () => {
    const { seeks, open, playTo } = renderLoop();
    open(firstOpening);
    playTo(11_000);
    playTo(2_000);
    playTo(3_000);
    expect(seeks).toEqual([10_000]);
  });

  it("keeps looping after the user seeks inside the clip", () => {
    const { seeks, open, playTo } = renderLoop();
    open(firstOpening);
    playTo(11_500);
    playTo(10_500);
    playTo(11_500);
    playTo(12_100);
    expect(seeks).toEqual([10_000, 10_000]);
  });

  it("stops looping once the card closes", () => {
    const { seeks, open, playTo, update } = renderLoop();
    open(firstOpening);
    update({ opening: null, clip: null });
    playTo(11_000);
    playTo(12_100);
    expect(seeks).toEqual([10_000]);
  });

  it("loops the clip of another card that opens while playing", () => {
    const { seeks, open, playTo } = renderLoop();
    open(firstOpening);
    open(secondOpening, otherClip);
    playTo(30_800);
    playTo(31_100);
    expect(seeks).toEqual([10_000, 30_000, 30_000]);
  });
});
