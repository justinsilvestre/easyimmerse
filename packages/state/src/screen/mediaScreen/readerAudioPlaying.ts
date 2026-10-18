import type { ReadableState } from "../../app/feature.ts";
import { initialPlayerState } from "./playerState.ts";
import type { PlayingState } from "./playingState.ts";

/**
 * Starts the player over for the audio file the open book turns out to be aligned with, with the file's stored position
 * to resume from. A position not yet read arrives later, as on the media screen.
 */
export function playingAlignedAudio(
  audioFileId: string,
  app: Pick<ReadableState, "storedPlaces">,
): PlayingState {
  return {
    player: initialPlayerState,
    isLooping: false,
    isPlayingClip: false,
    pendingResumeMs: app.storedPlaces.playback[audioFileId] ?? null,
  };
}
