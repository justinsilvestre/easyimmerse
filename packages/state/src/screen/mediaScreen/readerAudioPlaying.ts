import type { AppState } from "../../app/appState.ts";
import { selectPlayedMediaFile } from "./playedMediaFile.ts";
import { initialPlayerState } from "./playerState.ts";
import type { PlayingState } from "./playingState.ts";

/**
 * Starts the player over for the audio file the reader opened, with the file's stored position to resume from,
 * unless the player plays that file already. A position not yet read arrives later, as on the media screen.
 */
export function readerAudioOpened(
  playing: PlayingState,
  audioFileId: string,
  app: Pick<AppState, "route" | "screen" | "storedPlaces">,
): PlayingState {
  if (selectPlayedMediaFile(app).mediaFileId === audioFileId) return playing;
  return {
    player: initialPlayerState,
    isLooping: false,
    isPlayingClip: false,
    pendingResumeMs: app.storedPlaces.playback[audioFileId] ?? null,
  };
}
