import type { AudioClip } from "@easyimmerse/types";
import type { MediaScreenState } from "../screenState.ts";
import type { PlayerState } from "./playerState.ts";

/**
 * What the media screen plays: its player, whether it loops or plays to the end the clip of the flashcard open in the form,
 * and the place it is to resume from. The clip itself is the form's.
 */
export type PlayingState = {
  player: PlayerState;
  /** Whether playback loops the clip of the flashcard open in the form. */
  isLooping: boolean;
  /** Whether the editor's Play button started the clip, so that the player pauses at its end. */
  isPlayingClip: boolean;
  /** The stored position to seek to once the player has loaded the file; null once it is used, or when there is none. */
  pendingResumeMs: number | null;
};

/** The clip of the flashcard open in the form, or null when no card with a clip is open. */
export function formClipOf(screen: MediaScreenState): AudioClip | null {
  return screen.flashcardForm?.card.editor.content.audio_context ?? null;
}

/** The clip that playback loops, or null while nothing loops. */
export function loopClipOf(screen: MediaScreenState): AudioClip | null {
  return screen.playing.isLooping ? formClipOf(screen) : null;
}

/** The clip that the editor's Play button plays to its end, or null when nothing is to pause. */
export function playedClipOf(screen: MediaScreenState): AudioClip | null {
  return screen.playing.isPlayingClip ? formClipOf(screen) : null;
}
