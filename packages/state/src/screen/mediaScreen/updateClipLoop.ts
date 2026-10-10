import type { AudioClip } from "@easyimmerse/types";
import type { AppAction } from "../../app/appAction.ts";
import type { Effect } from "../../app/effect.ts";
import type { MediaScreenState } from "../screenState.ts";
import { seekTo } from "./seekTo.ts";

/**
 * Plays the clip of the flashcard open in the editor. Opening a card seeks to its clip's start, and if the player was playing,
 * the clip loops: playback that reaches its end seeks back to its start. The loop follows the clip's edges as they move,
 * and ends when the card closes, when playback pauses, or when a seek lands outside the clip.
 * The loop's own seek to the start reports a time inside the clip, so no guard against it is needed;
 * the platform's player lands seeks half a frame later still. Reported times are compared in whole milliseconds.
 */
export function updateClipLoop(
  screen: MediaScreenState,
  action: AppAction,
): readonly [MediaScreenState, readonly Effect[]] {
  const { loop } = screen;
  switch (action.type) {
    case "editedClipOpened":
      return action.clip === null
        ? [withLoop(screen, null), []]
        : seekTo(
            withLoop(screen, screen.player.isPlaying ? action.clip : null),
            action.clip.start_ms,
          );
    case "editedClipMoved":
      return [loop === null ? screen : withLoop(screen, action.clip), []];
    case "editedClipClosed":
      return [withLoop(screen, null), []];
    case "playerPlayingChanged":
      return [action.isPlaying ? screen : withLoop(screen, null), []];
    case "seekRequested":
    case "playerSeeking":
      return [
        loop !== null && !isInside(loop, Math.round(action.seconds * 1000))
          ? withLoop(screen, null)
          : screen,
        [],
      ];
    case "playerTimeChanged":
      return loop !== null && action.seconds * 1000 >= loop.end_ms
        ? seekTo(screen, loop.start_ms)
        : [screen, []];
    default:
      return [screen, []];
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
