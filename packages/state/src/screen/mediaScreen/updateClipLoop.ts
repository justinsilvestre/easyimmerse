import type { AudioClip } from "@easyimmerse/types";
import type { AppAction } from "../../app/appAction.ts";
import { updated } from "../../app/updated.ts";
import type { MediaScreenState } from "../screenState.ts";
import { seekTo } from "./seekTo.ts";

/**
 * Loops the clip of the flashcard open in the form, which `updateFlashcardForm` starts as the card opens:
 * playback that reaches the clip's end seeks back to its start. The loop ends when playback pauses or a seek lands outside the clip.
 * The loop's own seek to the start reports a time inside the clip, so no guard against it is needed;
 * the platform's player lands seeks half a frame later still. Reported times are compared in whole milliseconds.
 */
export function updateClipLoop(screen: MediaScreenState, action: AppAction) {
  const { loop } = screen;
  switch (action.type) {
    case "playerPlayingChanged":
      return updated(action.isPlaying ? screen : withLoop(screen, null));
    case "seekRequested":
    case "playerSeeking":
      return updated(
        loop !== null && !isInside(loop, Math.round(action.seconds * 1000))
          ? withLoop(screen, null)
          : screen,
      );
    case "playerTimeChanged":
      return loop !== null && action.seconds * 1000 >= loop.end_ms
        ? seekTo(screen, loop.start_ms)
        : updated(screen);
    default:
      return updated(screen);
  }
}

function isInside(clip: AudioClip, ms: number): boolean {
  return ms >= clip.start_ms && ms < clip.end_ms;
}

function withLoop(
  screen: MediaScreenState,
  loop: AudioClip | null,
): MediaScreenState {
  return screen.loop === loop ? screen : { ...screen, loop };
}
