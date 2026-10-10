import type { AudioClip } from "@easyimmerse/types";
import { updated } from "../../app/updated.ts";
import type { PlayingState } from "./playingState.ts";
import { seekTo } from "./seekTo.ts";

/** How far before the clip's start the player may report itself and still count as playing the clip. */
const startToleranceMs = 250;
/** How far past the clip's end the player may report itself and still be paused there, rather than having been moved on by the user. */
const endToleranceMs = 1000;

/**
 * Plays the clip of the flashcard open in the editor from its start, to be paused at its end by `pauseAtClipEnd`.
 * `followFormClip` moves the clip with its edges, and forgets it when the card closes or another opens.
 */
export function playClip(playing: PlayingState, clip: AudioClip) {
  const [seeking, effects] = seekTo(
    { ...playing, clipPlayback: clip },
    clip.start_ms,
  );
  return updated(seeking, ...effects, { type: "playPlayer" });
}

/**
 * Pauses the player once the time it recorded reaches the end of the clip that Play started, and forgets the clip once the time has left it.
 * Playback that the user moves away from the clip before then is left to play on.
 */
export function pauseAtClipEnd(playing: PlayingState) {
  const clip = playing.clipPlayback;
  if (clip === null) return updated(playing);
  const ms = playing.player.currentTimeSeconds * 1000;
  if (
    ms < clip.start_ms - startToleranceMs ||
    ms > clip.end_ms + endToleranceMs
  )
    return updated({ ...playing, clipPlayback: null });
  return ms >= clip.end_ms
    ? updated({ ...playing, clipPlayback: null }, { type: "pausePlayer" })
    : updated(playing);
}
