import type { AudioClip, Cue, TrackSelection } from "@easyimmerse/types";
import type { PickedFile, PickedMediaFile } from "../platform/effects.ts";
import type { MainRoute } from "../route/route.ts";
import type { StoredPlacesState } from "../storedPlaces/storedPlacesState.ts";
import { initialStoredPlaces } from "../storedPlaces/storedPlacesState.ts";
import type { DictionaryImportWizard } from "./dictionaryImport/dictionaryImportWizard.ts";
import type { LookupState } from "./lookup/lookupState.ts";
import { initialLookup } from "./lookup/lookupState.ts";
import type { MediaPanels } from "./mediaScreen/mediaPanels.ts";
import { initialMediaPanels } from "./mediaScreen/mediaPanels.ts";
import type { PathPlayback } from "./mediaScreen/pathPlayback.ts";
import type { PlayerState } from "./mediaScreen/playerState.ts";
import { initialPlayerState } from "./mediaScreen/playerState.ts";
import type { WaveformState } from "./mediaScreen/waveformState.ts";
import { initialWaveform } from "./mediaScreen/waveformState.ts";
import type { MediaImportWizard } from "./projectScreen/mediaImportWizard.ts";

/** The media screen's state, which the reader shares until it has state of its own. */
export type MediaScreenState = {
  kind: "media";
  player: PlayerState;
  /** The clip of the flashcard open in the editor while playback loops it; null while nothing loops. */
  loop: AudioClip | null;
  /** The clip that the editor's Play button started, which pauses the player at its end; null when nothing is to pause. */
  clipPlayback: AudioClip | null;
  /** The stored position to seek to once the player has loaded the file; null once it is used, or when there is none. */
  pendingResumeMs: number | null;
  /** How a file on the server's disk is to be played; null for a file the browser holds, or until the file's record arrives. */
  playback: PathPlayback | null;
  /** A picked subtitles file waiting to be added to the open media file. */
  pendingSubtitleFile: PickedFile | null;
  waveform: WaveformState;
  panels: MediaPanels;
  /** The dictionary pop-up and the flashcard waiting for a word's lookup, in the subtitles or in a book. */
  lookup: LookupState;
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
  dialog:
    | { kind: "filePick"; for: "subtitles" }
    /**
     * The choice of the open file's tracks. `selection` is what it shows, null for each kind's default track.
     * In the `choosing` stage it is the first choice, due before the first play, and holds the plan until answered;
     * in the `confirming` stage it was reopened while the file plays, which goes on until the user chooses.
     */
    | {
        kind: "trackChoice";
        selection: TrackSelection | null;
        stage: "choosing" | "confirming";
      }
    /** The notice that the open file is converted as it plays, with the state of its "Don't show this again" box. */
    | { kind: "conversionNotice"; dismissForGood: boolean }
    /** The media screen's dialog for the size and look of the subtitles over the stage. */
    | { kind: "subtitleAppearance" }
    /** The question whether to remove a dictionary, asked on the dictionaries page. */
    | { kind: "removeDictionary"; dictionaryId: string }
    | null;
};

/** Returns the state a main screen starts with, given the places already known to resume from. */
export function initialMainScreen(
  route: MainRoute,
  storedPlaces: StoredPlacesState = initialStoredPlaces,
): MainScreenState {
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
        loop: null,
        clipPlayback: null,
        pendingResumeMs: storedPlaces.playback[route.mediaFileId] ?? null,
        playback: null,
        pendingSubtitleFile: null,
        waveform: initialWaveform,
        panels: initialMediaPanels,
        lookup: initialLookup,
      };
  }
}

/** The screens when the app starts, on the home screen. */
export const initialScreen: ScreenState = {
  main: { kind: "home" },
  settings: null,
  dialog: null,
};
