import type { ChosenFile, FilePickPurpose } from "./filePick/chosenFile.ts";
import type { FlashcardEditorState } from "./flashcardEditor/flashcardEditorState.ts";
import { closedFlashcardEditor } from "./flashcardEditor/flashcardEditorState.ts";
import type { LookupState } from "./lookup/lookupState.ts";
import { closedLookup } from "./lookup/lookupState.ts";
import type { Screen } from "./navigation/screen.ts";
import type { PlayerState } from "./player/playerState.ts";
import { initialPlayerState } from "./player/playerState.ts";
import type { PreferenceKey } from "./preferences/preferenceKey.ts";
import type { ReaderState } from "./reader/readerState.ts";
import { initialReaderState } from "./reader/readerState.ts";
import type { SubtitlesState } from "./subtitles/subtitlesState.ts";
import { initialSubtitlesState } from "./subtitles/subtitlesState.ts";

export type AppState = {
  screen: Screen;
  player: PlayerState;
  subtitles: SubtitlesState;
  reader: ReaderState;
  lookup: LookupState;
  flashcardEditor: FlashcardEditorState;
  preferences: Partial<Record<PreferenceKey, string>>;
  /** What the open file dialog is for. Null when no dialog is open. */
  pendingFilePick: FilePickPurpose | null;
  chosenFile: ChosenFile | null;
};

export const initialAppState: AppState = {
  screen: { kind: "home" },
  player: initialPlayerState,
  subtitles: initialSubtitlesState,
  reader: initialReaderState,
  lookup: closedLookup,
  flashcardEditor: closedFlashcardEditor,
  preferences: {},
  pendingFilePick: null,
  chosenFile: null,
};
