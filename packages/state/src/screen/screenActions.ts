import type {
  AudioClip,
  ColumnRole,
  FormInput,
  PlaybackEnvironment,
  ProjectSettings,
  SubtitleRole,
  SubtitleSelection,
  TrackSelection,
} from "@easyimmerse/types";
import type {
  PickedDictionaryFile,
  PickedFile,
  PickedMediaFile,
} from "../platform/effects.ts";
import type { ItemSpan } from "./itemSpan.ts";
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
  /** The player has started a seek to a time, whether the app asked for it or not. */
  playerSeeking: (seconds: number) =>
    ({ type: "playerSeeking", seconds }) as const,
  /** The media element could not play the source at `url`, for the reason given in `cause`. */
  playerFailed: (url: string, cause: string) =>
    ({ type: "playerFailed", url, cause }) as const,
  /** The user opened or closed the media screen's subtitles panel. */
  cuePanelToggled: () => ({ type: "cuePanelToggled" }) as const,
  /** The cues the subtitles panel shows or nearly shows, as it measured them. */
  cuePanelSpanMeasured: (span: ItemSpan | null) =>
    ({ type: "cuePanelSpanMeasured", span }) as const,
  /** The user showed or hid the media screen's waveform. */
  waveformToggled: () => ({ type: "waveformToggled" }) as const,
  /** The user moved on to the next choice of subtitles over the stage: both, the target language, or the translation. */
  subtitleDisplayCycled: () => ({ type: "subtitleDisplayCycled" }) as const,
  /** The user hid or showed the subtitles over the stage. */
  subtitlesToggled: () => ({ type: "subtitlesToggled" }) as const,
  /** The user opened the dialog for the size and look of the subtitles over the stage. */
  subtitleAppearanceOpened: () =>
    ({ type: "subtitleAppearanceOpened" }) as const,
  /** The user closed the subtitle appearance dialog. */
  subtitleAppearanceClosed: () =>
    ({ type: "subtitleAppearanceClosed" }) as const,
  /** The user asked to play a flashcard's clip from its start, pausing at its end. */
  clipPlayRequested: (clip: AudioClip) =>
    ({ type: "clipPlayRequested", clip }) as const,
  /** The browser's media support for a file's formats, as measured to choose its playback method. */
  playbackEnvironmentMeasured: (
    mediaFileId: string,
    environment: PlaybackEnvironment,
  ) =>
    ({
      type: "playbackEnvironmentMeasured",
      mediaFileId,
      environment,
    }) as const,
  /** The user asked to choose the open file's tracks again. */
  trackChoiceRequested: () => ({ type: "trackChoiceRequested" }) as const,
  /** The user selected other tracks in the track choice, before choosing them. */
  trackChoiceChanged: (selection: TrackSelection) =>
    ({ type: "trackChoiceChanged", selection }) as const,
  /** The user chose the tracks to play. */
  tracksChosen: (selection: TrackSelection) =>
    ({ type: "tracksChosen", selection }) as const,
  trackChoiceCancelled: () => ({ type: "trackChoiceCancelled" }) as const,
  /** The user ticked or cleared the conversion notice's "Don't show this again" box. */
  conversionNoticeDismissalToggled: () =>
    ({ type: "conversionNoticeDismissalToggled" }) as const,
  /** The user let the conversion of the open file go ahead. */
  conversionNoticeAccepted: () =>
    ({ type: "conversionNoticeAccepted" }) as const,
  playToggleRequested: () => ({ type: "playToggleRequested" }) as const,
  playRequested: () => ({ type: "playRequested" }) as const,
  pauseRequested: () => ({ type: "pauseRequested" }) as const,
  playerPlayingChanged: (isPlaying: boolean) =>
    ({ type: "playerPlayingChanged", isPlaying }) as const,
  /** The user chose a track for a role of the subtitles, or none; `shown` is the selection the track bar showed. */
  subtitleTrackChosen: (
    role: SubtitleRole,
    trackId: string | null,
    shown: SubtitleSelection,
  ) => ({ type: "subtitleTrackChosen", role, trackId, shown }) as const,
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
  /** The user asked to remove a media file from the project shown. */
  mediaFileRemovalRequested: (mediaFileId: string) =>
    ({ type: "mediaFileRemovalRequested", mediaFileId }) as const,
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
  /** The user closed the media import dialog. The server finishes a fetch it has started. */
  mediaImportClosed: () => ({ type: "mediaImportClosed" }) as const,
  /**
   * The route moved away from the media screen. The screens pass it to the media screen in place of the action that moved the route,
   * within the same update; it is never dispatched.
   */
  mediaScreenLeft: () => ({ type: "mediaScreenLeft" }) as const,
  /** The user opened the media interface of the plugin the open media file was imported through. */
  sourceMediaOpened: () => ({ type: "sourceMediaOpened" }) as const,
  /** The user pressed an action of the source dialog's form, with what they entered. */
  sourceMediaStepTaken: (action: string, input: FormInput[]) =>
    ({ type: "sourceMediaStepTaken", action, input }) as const,
  /** The user closed the source dialog. A step in flight is left to finish, and its skipped tracks are still named. */
  sourceMediaClosed: () => ({ type: "sourceMediaClosed" }) as const,
  /** The user chose what a previewed table's column holds. */
  dictionaryColumnRoleChosen: (index: number, role: ColumnRole) =>
    ({ type: "dictionaryColumnRoleChosen", index, role }) as const,
  /** The user switched whether a previewed table's first row is a header. */
  dictionaryHeaderRowToggled: () =>
    ({ type: "dictionaryHeaderRowToggled" }) as const,
  /** The user checked a previewed table's columns and asked for it to be imported with them. */
  dictionaryColumnsConfirmed: () =>
    ({ type: "dictionaryColumnsConfirmed" }) as const,
  dictionaryColumnsCancelled: () =>
    ({ type: "dictionaryColumnsCancelled" }) as const,
  /** The user dismissed the alert that a file could not be added. */
  dictionaryImportAlertDismissed: () =>
    ({ type: "dictionaryImportAlertDismissed" }) as const,
  /** The user submitted a project form: the new project's settings, or an existing project's. */
  projectFormSubmitted: (settings: ProjectSettings) =>
    ({ type: "projectFormSubmitted", settings }) as const,
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
