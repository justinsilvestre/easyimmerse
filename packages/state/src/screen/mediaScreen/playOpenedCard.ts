import type { AudioClip } from "@easyimmerse/types";
import type { AppState } from "../../app/appState.ts";
import { updated } from "../../app/updated.ts";
import { mediaScreenOf } from "../../flashcards/flashcardsOnScreen.ts";
import { formClipOf, type PlayingState } from "./playingState.ts";
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

/** The clip of the flashcard open in the form before the action, or null. */
export function openClipOf(app: AppState): AudioClip | null {
  const onScreen = mediaScreenOf(app);
  return onScreen === null ? null : formClipOf(onScreen.screen);
}
