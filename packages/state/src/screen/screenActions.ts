import type {
  PickedDictionaryFile,
  PickedFile,
  PickedMediaFile,
} from "../platform/effects.ts";
import type { BufferedRange } from "./mediaScreen/playerState.ts";

/** The action creators of the screens: the player's requests and reports, and the file picks and their outcomes. */
export const screenActions = {
  seekRequested: (seconds: number) =>
    ({ type: "seekRequested", seconds }) as const,
  playerTimeChanged: (seconds: number) =>
    ({ type: "playerTimeChanged", seconds }) as const,
  playerDurationChanged: (seconds: number) =>
    ({ type: "playerDurationChanged", seconds }) as const,
  playerBufferedChanged: (buffered: readonly BufferedRange[]) =>
    ({ type: "playerBufferedChanged", buffered }) as const,
  playToggleRequested: () => ({ type: "playToggleRequested" }) as const,
  playRequested: () => ({ type: "playRequested" }) as const,
  pauseRequested: () => ({ type: "pauseRequested" }) as const,
  playerPlayingChanged: (isPlaying: boolean) =>
    ({ type: "playerPlayingChanged", isPlaying }) as const,
  subtitleFilePickRequested: () =>
    ({ type: "subtitleFilePickRequested" }) as const,
  subtitleFileChosen: (file: PickedFile) =>
    ({ type: "subtitleFileChosen", file }) as const,
  subtitleFilePickCancelled: () =>
    ({ type: "subtitleFilePickCancelled" }) as const,
  mediaFilePickRequested: () => ({ type: "mediaFilePickRequested" }) as const,
  mediaFileChosen: (file: PickedMediaFile) =>
    ({ type: "mediaFileChosen", file }) as const,
  mediaFilePickCancelled: () => ({ type: "mediaFilePickCancelled" }) as const,
  dictionaryFilePickRequested: () =>
    ({ type: "dictionaryFilePickRequested" }) as const,
  dictionaryFileChosen: (file: PickedDictionaryFile) =>
    ({ type: "dictionaryFileChosen", file }) as const,
  dictionaryFilePickCancelled: () =>
    ({ type: "dictionaryFilePickCancelled" }) as const,
  dictionaryFileHandled: () => ({ type: "dictionaryFileHandled" }) as const,
};

/** An action of the screens. */
export type ScreenAction = ReturnType<
  (typeof screenActions)[keyof typeof screenActions]
>;
