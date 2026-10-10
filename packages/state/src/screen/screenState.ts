import type { Cue } from "@easyimmerse/types";
import type { PickedFile, PickedMediaFile } from "../platform/effects.ts";
import type { MainRoute } from "../route/route.ts";
import type { DictionaryImportWizard } from "./dictionaryImport/dictionaryImportWizard.ts";
import type { PlayerState } from "./mediaScreen/playerState.ts";
import { initialPlayerState } from "./mediaScreen/playerState.ts";
import type { WaveformState } from "./mediaScreen/waveformState.ts";
import { initialWaveform } from "./mediaScreen/waveformState.ts";
import type { MediaImportWizard } from "./projectScreen/mediaImportWizard.ts";

/** The media screen's state, which the reader shares until it has state of its own. */
export type MediaScreenState = {
  kind: "media";
  player: PlayerState;
  /** A picked subtitles file waiting to be added to the open media file. */
  pendingSubtitleFile: PickedFile | null;
  waveform: WaveformState;
};

/** The offline screen's state: the cues of the subtitles file last picked, parsed in the browser when no server is connected. */
export type OfflineScreenState = {
  kind: "offline";
  cues: readonly Cue[];
  hasFailed: boolean;
  /** True while the file last picked is being parsed. */
  parsing: boolean;
};

/** The project overview's state: a picked media file, held while its requests run, and the media import dialog. */
export type ProjectScreenState = {
  kind: "project";
  pendingMediaFile: PickedMediaFile | null;
  mediaImport: MediaImportWizard | null;
};

/** The main screen's own state, keyed by the route's main screen. The ids it belongs to are in the route. */
export type MainScreenState =
  | { kind: "home" }
  | { kind: "newProject" }
  | { kind: "projectSettings" }
  | OfflineScreenState
  | ProjectScreenState
  | MediaScreenState;

/** State that exists only while a screen is open. */
export type ScreenState = {
  /** The main screen's own state. Replaced when the route's main screen changes. */
  main: MainScreenState;
  /** Settings open over the main screen, which stays mounted beneath them. Null while they are closed. */
  settings: { dictionaryImport: DictionaryImportWizard | null } | null;
  /** The one modal dialog open, if any. The platform's file picker counts as one, though the app does not draw it. */
  dialog: { kind: "filePick"; for: "subtitles" } | null;
};

/** Returns the state a main screen starts with. */
export function initialMainScreen(route: MainRoute): MainScreenState {
  switch (route.screen) {
    case "home":
    case "newProject":
    case "projectSettings":
      return { kind: route.screen };
    case "offline":
      return { kind: "offline", cues: [], hasFailed: false, parsing: false };
    case "project":
      return { kind: "project", pendingMediaFile: null, mediaImport: null };
    case "media":
      return {
        kind: "media",
        player: initialPlayerState,
        pendingSubtitleFile: null,
        waveform: initialWaveform,
      };
  }
}

/** The screens when the app starts, on the home screen. */
export const initialScreen: ScreenState = {
  main: { kind: "home" },
  settings: null,
  dialog: null,
};
