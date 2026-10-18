import type { AudioClip } from "@easyimmerse/types";
import { updated } from "../../app/updated.ts";
import type { PlayingState } from "./playingState.ts";
import { seekTo } from "./seekTo.ts";

/** How far before the clip's start the player may report itself and still count as playing the clip. */
const startToleranceMs = 250;
/** How far past the clip's end the player may report itself and still be paused there, rather than having been moved on by the user. */
const endToleranceMs = 1000;

/** Plays the clip of the flashcard open in the editor from its start, to be paused at its end by `pauseAtClipEnd`. */
export function playClip(playing: PlayingState, clip: AudioClip) {
  const [seeking, effects] = seekTo(
    { ...playing, isPlayingClip: true },
    clip.start_ms,
  );
  return updated(seeking, ...effects, { type: "playPlayer" });
}

/**
 * Pauses the player once the time it recorded reaches the end of the clip that Play started, and stops following the clip once the time has left it.
 * Playback that the user moves away from the clip before then is left to play on.
 */
export function pauseAtClipEnd(playing: PlayingState, clip: AudioClip | null) {
  if (!playing.isPlayingClip) return updated(playing);
  const stopped = { ...playing, isPlayingClip: false };
  if (clip === null) return updated(stopped);
  const ms = playing.player.currentTimeSeconds * 1000;
  if (
    ms < clip.start_ms - startToleranceMs ||
    ms > clip.end_ms + endToleranceMs
  )
    return updated(stopped);
  return ms >= clip.end_ms
    ? updated(stopped, { type: "pausePlayer" })
    : updated(playing);
}
