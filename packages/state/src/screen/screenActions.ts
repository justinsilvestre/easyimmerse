import type { FormInput, TableLayout } from "@easyimmerse/types";
import type {
  PickedDictionaryFile,
  PickedFile,
  PickedMediaFile,
} from "../platform/effects.ts";
import type { BufferedRange } from "./mediaScreen/playerState.ts";
import type { WaveformViewName } from "./mediaScreen/waveformState.ts";
import type { WaveformWindowView } from "./mediaScreen/waveformWindowPolicy.ts";
import type { MediaImportSource } from "./projectScreen/mediaImportWizard.ts";

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
  mediaImportOpened: (source: MediaImportSource) =>
    ({ type: "mediaImportOpened", source }) as const,
  /** The user pressed an action of the media import dialog's form, with what they entered. */
  mediaImportStepTaken: (action: string, input: FormInput[]) =>
    ({ type: "mediaImportStepTaken", action, input }) as const,
  mediaImportClosed: () => ({ type: "mediaImportClosed" }) as const,
  /** The user checked a previewed table's columns and asked for it to be imported with them. */
  dictionaryColumnsChosen: (layout: TableLayout) =>
    ({ type: "dictionaryColumnsChosen", layout }) as const,
  dictionaryColumnsCancelled: () =>
    ({ type: "dictionaryColumnsCancelled" }) as const,
  /** The user dismissed the alert that a file could not be added. */
  dictionaryImportAlertDismissed: () =>
    ({ type: "dictionaryImportAlertDismissed" }) as const,
  /** A waveform view now shows a different stretch of the file, or its duration became known; null once it is no longer shown. */
  waveformViewChanged: (
    name: WaveformViewName,
    view: WaveformWindowView | null,
  ) => ({ type: "waveformViewChanged", name, view }) as const,
  /** The user zoomed the player's waveform strip to show the given span. */
  waveformZoomed: (spanMs: number) =>
    ({ type: "waveformZoomed", spanMs }) as const,
  /** The delay after a window's failed request has passed, so the window may be requested again. */
  waveformRetryDue: (name: WaveformViewName, startMs: number) =>
    ({ type: "waveformRetryDue", name, startMs }) as const,
};

/** An action of the screens. */
export type ScreenAction = ReturnType<
  (typeof screenActions)[keyof typeof screenActions]
>;
