import type { AudioClip } from "@easyimmerse/types";
import type { AppAction } from "../../app/appAction.ts";
import { updated } from "../../app/updated.ts";
import type { MediaScreenState } from "../screenState.ts";
import { seekTo } from "./seekTo.ts";

/** How far before the clip's start the player may report itself and still count as playing the clip. */
const startToleranceMs = 250;
/** How far past the clip's end the player may report itself and still be paused there, rather than having been moved on by the user. */
const endToleranceMs = 1000;

/**
 * Plays the clip of the flashcard open in the editor from its start, and pauses the player once playback reaches its end.
 * Playback that the user pauses, or moves away from the clip, before then is left to play on, as is a clip that loops.
 * It reads the player's time after the player and the loop have seen the action, so it follows them in `updateMediaScreen`.
 * `updateFlashcardForm` moves the clip with its edges, and forgets it when the card closes or another opens.
 */
export function updateClipPlayback(
  screen: MediaScreenState,
  action: AppAction,
) {
  const clip = screen.clipPlayback;
  switch (action.type) {
    case "clipPlayRequested": {
      const [seeking, effects] = seekTo(
        withClipPlayback(screen, action.clip),
        action.clip.start_ms,
      );
      return updated(seeking, ...effects, { type: "playPlayer" });
    }
    case "playerPlayingChanged":
      return updated(
        action.isPlaying ? screen : withClipPlayback(screen, null),
      );
    case "playerTimeChanged":
      // The player's time, which the loop has already moved back to the clip's start when it loops.
      return clip === null
        ? updated(screen)
        : timeUpdated(screen, clip, screen.player.currentTimeSeconds * 1000);
    default:
      return updated(screen);
  }
}

/** Pauses at the clip's end, and forgets the clip once the time has left it. */
function timeUpdated(screen: MediaScreenState, clip: AudioClip, ms: number) {
  if (
    ms < clip.start_ms - startToleranceMs ||
    ms > clip.end_ms + endToleranceMs
  )
    return updated(withClipPlayback(screen, null));
  return ms >= clip.end_ms
    ? updated(withClipPlayback(screen, null), { type: "pausePlayer" })
    : updated(screen);
}

function withClipPlayback(
  screen: MediaScreenState,
  clipPlayback: AudioClip | null,
): MediaScreenState {
  return screen.clipPlayback === clipPlayback
    ? screen
    : { ...screen, clipPlayback };
}
