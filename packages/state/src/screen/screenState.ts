import type { Cue, TrackSelection } from "@easyimmerse/types";
import type { AnkiExportDialog } from "../anki/ankiExportDialog.ts";
import type { FlashcardForm } from "../flashcards/flashcardForm.ts";
import type { PickedFile, PickedMediaFile } from "../platform/effects.ts";
import {
  initialReviewScreen,
  type ReviewScreenState,
} from "../review/reviewScreenState.ts";
import type { MainRoute } from "../route/route.ts";
import type { StoredPlacesState } from "../storedPlaces/storedPlacesState.ts";
import { initialStoredPlaces } from "../storedPlaces/storedPlacesState.ts";
import type { ItemSpan } from "./itemSpan.ts";
import {
  initialLibraryBrowseFilter,
  type LibraryBrowseFilter,
} from "./libraryBrowse/libraryBrowseFilter.ts";
import {
  initialLibraryEdit,
  type LibraryEditState,
} from "./libraryEdit/libraryEditState.ts";
import type { LibraryCreation } from "./libraryManage/libraryCreation.ts";
import type { LibraryLanguageForm } from "./libraryManage/libraryLanguageForm.ts";
import type { LookupState } from "./lookup/lookupState.ts";
import { initialLookup } from "./lookup/lookupState.ts";
import type { MediaPanels } from "./mediaScreen/mediaPanels.ts";
import { initialMediaPanels } from "./mediaScreen/mediaPanels.ts";
import type { PathPlayback } from "./mediaScreen/pathPlayback.ts";
import { initialPlayerState } from "./mediaScreen/playerState.ts";
import type { PlayingState } from "./mediaScreen/playingState.ts";
import type { WaveformState } from "./mediaScreen/waveformState.ts";
import { initialWaveform } from "./mediaScreen/waveformState.ts";
import type { PluginFormWizard } from "./pluginForm/pluginFormWizard.ts";
import type { ReaderScreenState } from "./readerScreen/readerScreenState.ts";
import { initialReaderScreen } from "./readerScreen/readerScreenState.ts";

/** The media screen's state, which the reader shares until it has state of its own. */
export type MediaScreenState = {
  kind: "media";
  /**
   * The flashcard open in the form, or null when the form is closed.
   * Leaving the screen saves its card in the background, so the form never outlives the screen.
   */
  flashcardForm: FlashcardForm | null;
  playing: PlayingState;
  /** How a file on the server's disk is to be played; null for a file the browser holds, or until the file's record arrives. */
  playback: PathPlayback | null;
  /** A picked subtitles file waiting to be added to the open media file. */
  pendingSubtitleFile: PickedFile | null;
  waveform: WaveformState;
  panels: MediaPanels;
  /** The dictionary pop-up and the flashcard waiting for a word's lookup, in the subtitles or in a book. */
  lookup: LookupState;
  /** The dialog of the plugin the media file was imported through, or null while it is closed. */
  sourceMedia: PluginFormWizard | null;
  /** The reader's state, while the open file is a book. Shared with the media screen until the route can tell a book. */
  reader: ReaderScreenState;
  /** The cues the subtitles panel shows or nearly shows, by position; null while it is closed or unmeasured. */
  cuePanelSpan: ItemSpan | null;
};

/** The offline screen's state: the cues of the subtitles file last picked, parsed in the browser when no server is connected. */
export type OfflineScreenState = {
  kind: "offline";
  cues: readonly Cue[];
  hasFailed: boolean;
};

/** The project overview's state: a picked media file, held while its requests run, and the overview's dialogs other than the media import's. */
export type ProjectScreenState = {
  kind: "project";
  pendingMediaFile: PickedMediaFile | null;
  ankiExport: AnkiExportDialog | null;
  isAnkiConnectSetupOpen: boolean;
};

/** The main screen's own state, keyed by the route's main screen. The ids it belongs to are in the route. */
export type MainScreenState =
  | { kind: "home" }
  | { kind: "newProject" }
  | { kind: "projectSettings" }
  | { kind: "library" }
  | { kind: "libraryItem" }
  /** The library management screen, with the new item on its way, if any. */
  | {
      kind: "libraryManage";
      creation: LibraryCreation | null;
      languageForm: LibraryLanguageForm;
    }
  | { kind: "libraryEdit" }
  | OfflineScreenState
  | ProjectScreenState
  | ReviewScreenState
  | MediaScreenState;

/** State that exists only while a screen is open. */
export type ScreenState = {
  /** The main screen's own state. Replaced when the route's main screen changes. */
  main: MainScreenState;
  /** Which items the library screen shows, kept while the app runs so that leaving the library and coming back keeps it. */
  libraryBrowse: LibraryBrowseFilter;
  /** The choices of the library item and library management screens, which stories and tests can set through actions. */
  libraryEdit: LibraryEditState;
  /** Settings open over the main screen, which stays mounted beneath them. Null while they are closed. */
  settings: {
    /** How the last clearing of the media cache, or a failed change of its size, went, while the general page is on top. */
    conversionCacheReport: string | null;
  } | null;
  /** The one modal dialog open, if any. The platform's file picker counts as one, though the app does not draw it. */
  dialog:
    | { kind: "filePick"; for: "subtitles" }
    /**
     * The choice of the open file's tracks. `selection` is what it shows, null for each kind's default track.
     * In the `choosing` stage it is the first choice, due before the first play, and holds the playback method request until answered;
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
    /** The reader's notice about combining the open book and its translation into a bilingual ebook. */
    | { kind: "bilingualEbook" }
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
    case "library":
    case "libraryItem":
    case "libraryEdit":
      return { kind: route.screen };
    case "libraryManage":
      return { kind: "libraryManage", creation: null, languageForm: "closed" };
    case "offline":
      return { kind: "offline", cues: [], hasFailed: false };
    case "project":
      return {
        kind: "project",
        pendingMediaFile: null,
        ankiExport: null,
        isAnkiConnectSetupOpen: false,
      };
    case "review":
      return initialReviewScreen;
    case "media":
      return {
        kind: "media",
        playing: {
          player: initialPlayerState,
          isLooping: false,
          isPlayingClip: false,
          pendingResumeMs: storedPlaces.playback[route.mediaFileId] ?? null,
        },
        playback: null,
        pendingSubtitleFile: null,
        waveform: initialWaveform,
        panels: initialMediaPanels,
        lookup: initialLookup,
        sourceMedia: null,
        flashcardForm: null,
        reader: initialReaderScreen,
        cuePanelSpan: null,
      };
  }
}

/** The screens when the app starts, on the home screen. */
export const initialScreen: ScreenState = {
  main: { kind: "home" },
  libraryBrowse: initialLibraryBrowseFilter,
  libraryEdit: initialLibraryEdit,
  settings: null,
  dialog: null,
};
