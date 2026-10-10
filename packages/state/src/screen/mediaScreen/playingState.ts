import type { AudioClip } from "@easyimmerse/types";
import type { PlayerState } from "./playerState.ts";

/** What the media screen plays: its player, the clip of the open flashcard it loops or plays to the end, and the place it is to resume from. */
export type PlayingState = {
  player: PlayerState;
  /** The clip of the flashcard open in the form while playback loops it; null while nothing loops. */
  loop: AudioClip | null;
  /** The clip that the editor's Play button started, which pauses the player at its end; null when nothing is to pause. */
  clipPlayback: AudioClip | null;
  /** The stored position to seek to once the player has loaded the file; null once it is used, or when there is none. */
  pendingResumeMs: number | null;
};
