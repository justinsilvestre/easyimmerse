import type { AppState } from "../../app/appState.ts";
import type { AppRoot } from "../../app/createAppStore.ts";
import { selectReaderPreferences } from "../../preferences/readerPreferences.ts";
import {
  selectFlashcardForm,
  selectMediaScreen,
} from "../mediaScreen/mediaScreenSelectors.ts";
import {
  initialReaderScreen,
  type ReaderScreenState,
} from "./readerScreenState.ts";

/** Returns the reader's state, or its defaults while no media screen is open. */
export const selectReaderScreen = (state: AppRoot): ReaderScreenState =>
  state.app.screen.main.kind === "media"
    ? state.app.screen.main.reader
    : initialReaderScreen;

/** Tells whether one of the reader's panels, or the flashcard editor beside the text, is open. */
export function selectIsReaderPanelOpen(
  app: Pick<AppState, "route" | "screen">,
): boolean {
  const panel = selectMediaScreen(app)?.screen.reader.panel ?? null;
  return panel !== null || selectFlashcardForm(app) !== null;
}

/** Tells whether the reader lays the text out in pages rather than in one scrolling column. */
export function selectIsReaderPaged(
  app: Pick<AppState, "preferences">,
): boolean {
  return selectReaderPreferences(app).layout === "pages";
}
