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
  type ReaderTranslationStatus,
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

/** Returns the view the reader shows, as `shownReaderViewMode` describes, or the book alone while no media screen is open. */
export function selectShownReaderViewMode(
  app: Pick<AppState, "route" | "screen">,
): ReaderViewMode {
  const reader = selectMediaScreen(app)?.screen.reader;
  return reader ? shownReaderViewMode(reader) : "target";
}

/**
 * The view the reader shows: the one chosen once the translation it needs is ready, or else the book alone.
 * The translation-only view needs the translation loaded, and the views that show both texts need it aligned with the book.
 */
export function shownReaderViewMode(
  reader: Pick<ReaderScreenState, "viewMode" | "translationStatus">,
): ReaderViewMode {
  return viewModesReady[reader.translationStatus].includes(reader.viewMode)
    ? reader.viewMode
    : "target";
}

const viewModesReady: Record<
  ReaderTranslationStatus,
  readonly ReaderViewMode[]
> = {
  absent: ["target"],
  unaligned: ["target", "translation"],
  aligned: ["target", "translation", "interlinear", "parallel"],
};

/** Tells whether the reader lays the text out in pages rather than in one scrolling column, in the view it shows, as `isReaderPaged` decides. */
export function selectIsReaderPaged(
  app: Pick<AppState, "route" | "screen" | "preferences">,
): boolean {
  return isReaderPaged(
    selectReaderPreferences(app).layout,
    selectShownReaderViewMode(app),
  );
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
