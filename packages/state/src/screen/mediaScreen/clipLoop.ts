import type { AudioClip } from "@easyimmerse/types";
import { updated } from "../../app/updated.ts";
import type { PlayingState } from "./playingState.ts";
import { seekTo } from "./seekTo.ts";

/**
 * Seeks back to the start of the clip that loops, which `followFormClip` starts as a card opens, once playback reaches its end.
 * The loop's own seek to the start reports a time inside the clip, so no guard against it is needed;
 * the platform's player lands seeks half a frame later still.
 */
export function loopAtEnd(playing: PlayingState, seconds: number) {
  const { loop } = playing;
  return loop !== null && seconds * 1000 >= loop.end_ms
    ? seekTo(playing, loop.start_ms)
    : updated(playing);
}

/** Ends the loop when a seek lands outside its clip. Seek times are compared in whole milliseconds. */
export function endLoopOutside(
  playing: PlayingState,
  seconds: number,
): PlayingState {
  const { loop } = playing;
  return loop !== null && !isInside(loop, Math.round(seconds * 1000))
    ? { ...playing, loop: null }
    : playing;
}

function isInside(clip: AudioClip, ms: number): boolean {
  return ms >= clip.start_ms && ms < clip.end_ms;
}
