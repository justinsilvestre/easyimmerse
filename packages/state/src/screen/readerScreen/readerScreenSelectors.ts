import type { AppState } from "../../app/appState.ts";
import type { AppRoot } from "../../app/createAppStore.ts";
import {
  type ReaderPreferences,
  selectReaderPreferences,
} from "../../preferences/readerPreferences.ts";
import {
  selectFlashcardForm,
  selectMediaScreen,
} from "../mediaScreen/mediaScreenSelectors.ts";
import {
  initialReaderScreen,
  type ReaderScreenState,
  type ReaderViewMode,
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

/** Tells whether the reader lays the text out in pages rather than in one scrolling column, as `isReaderPaged` decides. */
export function selectIsReaderPaged(
  app: Pick<AppState, "route" | "screen" | "preferences">,
): boolean {
  const viewMode = selectMediaScreen(app)?.screen.reader.viewMode ?? "target";
  return isReaderPaged(selectReaderPreferences(app).layout, viewMode);
}

/**
 * Whether the reader lays the text out in pages, in the layout the preferences choose, for the text it shows.
 * The parallel view always scrolls: each of its rows pairs a paragraph with its translation side by side,
 * and the paged layout's CSS columns cannot split such a row between pages, so a long row would be cut off at the page's foot.
 */
export function isReaderPaged(
  layout: ReaderPreferences["layout"],
  viewMode: ReaderViewMode,
): boolean {
  return layout === "pages" && viewMode !== "parallel";
}
