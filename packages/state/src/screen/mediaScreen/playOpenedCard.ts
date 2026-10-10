import type { AudioClip } from "@easyimmerse/types";
import { updated } from "../../app/updated.ts";
import type { PlayingState } from "./playingState.ts";
import { seekTo } from "./seekTo.ts";

/**
 * Plays the clip of a flashcard as it opens in the form: seeks to the clip's start, and loops the clip if the player was playing.
 * The loop and the clip Play read the clip from the form, so they follow its edges as they move, and stop with the form.
 */
export function playOpenedCard(playing: PlayingState, clip: AudioClip | null) {
  const isLooping = clip !== null && playing.player.isPlaying;
  const reset = { ...playing, isLooping, isPlayingClip: false };
  return clip === null ? updated(reset) : seekTo(reset, clip.start_ms);
}
