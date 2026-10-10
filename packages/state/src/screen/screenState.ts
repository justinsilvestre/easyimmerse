import type { Cue } from "@easyimmerse/types";
import type {
  PickedDictionaryFile,
  PickedFile,
  PickedMediaFile,
} from "../platform/effects.ts";
import type { MainRoute } from "../route/route.ts";
import type { PlayerState } from "./mediaScreen/playerState.ts";
import { initialPlayerState } from "./mediaScreen/playerState.ts";

/** The media screen's state, which the reader shares until it has state of its own. */
export type MediaScreenState = {
  kind: "media";
  player: PlayerState;
  /** A picked subtitles file waiting to be added to the open media file. */
  pendingSubtitleFile: PickedFile | null;
};

/** The offline screen's state: the cues of the subtitles file last picked, parsed in the browser when no server is connected. */
export type OfflineScreenState = {
  kind: "offline";
  cues: readonly Cue[];
  hasFailed: boolean;
};

/** The main screen's own state, keyed by the route's main screen. The ids it belongs to are in the route. */
export type MainScreenState =
  | { kind: "home" }
  | { kind: "newProject" }
  | { kind: "projectSettings" }
  | OfflineScreenState
  /** A picked media file waiting to be added to the project. */
  | { kind: "project"; pendingMediaFile: PickedMediaFile | null }
  | MediaScreenState;

/** The dictionary import's first stage: a picked file not yet sent. */
export type DictionaryImportStage = {
  stage: "fileChosen";
  file: PickedDictionaryFile;
};

/** State that exists only while a screen is open. */
export type ScreenState = {
  /** The main screen's own state. Replaced when the route's main screen changes. */
  main: MainScreenState;
  /** Settings open over the main screen, which stays mounted beneath them. Null while they are closed. */
  settings: { dictionaryImport: DictionaryImportStage | null } | null;
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
      return { kind: "offline", cues: [], hasFailed: false };
    case "project":
      return { kind: "project", pendingMediaFile: null };
    case "media":
      return {
        kind: "media",
        player: initialPlayerState,
        pendingSubtitleFile: null,
      };
  }
}

/** The screens when the app starts, on the home screen. */
export const initialScreen: ScreenState = {
  main: { kind: "home" },
  settings: null,
  dialog: null,
};
