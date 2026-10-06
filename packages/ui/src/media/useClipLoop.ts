import type { AudioClip } from "@easyimmerse/types";
import { useEffect, useRef } from "react";

/** The player as the loop reads it: whether it plays, and where it is. */
export type LoopedPlayer = { isPlaying: boolean; currentMs: number };

/**
 * The longest step forward between two time updates of a player left to play on its own.
 * A longer jump, or any jump backward, is a seek.
 */
const playbackStepMs = 1500;
/** How far behind the last time a player's time may step and still count as playing on, as rounding can make it. */
const backwardJitterMs = 50;
/** How far from a seek the loop asked for the player's time may lie and still count as that seek having landed. */
const ownSeekToleranceMs = 250;

/**
 * Plays the clip of the flashcard open in the editor, so that the user hears what the card holds while editing it.
 * Each time a card opens, which `opening` tells apart from every other opening, the player seeks to its clip's start.
 * If the player was playing at that moment, the clip then loops: whenever playback reaches the clip's end, it seeks back to its start.
 * The loop follows `clip` as its edges are dragged. It ends when the card closes or another opens,
 * when playback pauses, or when the user seeks outside the clip; a seek inside the clip leaves it going.
 * The loop tells its own seeks from the user's by the time each one asked for.
 */
export function useClipLoop(
  opening: unknown,
  clip: AudioClip | null,
  player: LoopedPlayer,
  seek: (ms: number) => void,
) {
  const loop = useRef({
    opening: null as unknown,
    isLooping: false,
    /** The time of the loop's latest seek, until the player has moved on from it. */
    ownSeekMs: null as number | null,
    lastMs: player.currentMs,
  });
  useEffect(() => {
    const state = loop.current;
    const { currentMs, isPlaying } = player;
    if (opening !== state.opening) {
      state.opening = opening;
      state.isLooping = false;
      state.ownSeekMs = null;
      state.lastMs = currentMs;
      if (opening === null || clip === null) return;
      state.isLooping = isPlaying;
      state.ownSeekMs = clip.start_ms;
      state.lastMs = clip.start_ms;
      seek(clip.start_ms);
      return;
    }
    const previousMs = state.lastMs;
    state.lastMs = currentMs;
    if (!state.isLooping || clip === null) return;
    if (!isPlaying) {
      state.isLooping = false;
      return;
    }
    if (state.ownSeekMs !== null) {
      if (Math.abs(currentMs - state.ownSeekMs) <= ownSeekToleranceMs) return;
      state.ownSeekMs = null;
    }
    const isPlayingOn =
      currentMs >= previousMs - backwardJitterMs &&
      currentMs <= previousMs + playbackStepMs;
    const isInsideClip = currentMs >= clip.start_ms && currentMs < clip.end_ms;
    if (!isPlayingOn) {
      if (!isInsideClip) state.isLooping = false;
      return;
    }
    if (currentMs >= clip.end_ms) {
      state.ownSeekMs = clip.start_ms;
      state.lastMs = clip.start_ms;
      seek(clip.start_ms);
    }
  });
}
