import type { ReaderLocation } from "../../storedPlaces/readingLocation.ts";
import type { ItemSpan } from "../itemSpan.ts";
import type { TextDirection } from "../lookup/textStep.ts";
import type {
  PageInfo,
  ReaderPanel,
  ReaderViewMode,
} from "./readerScreenState.ts";

/** The action creators of the reader: its jumps, panels, dialogs, chrome and search, and the paragraphs and the page it measured in view. */
export const readerScreenActions = {
  /**
   * The user chose which text to show. The translation-only view opens at `translationLocation` when given,
   * such as the translation of the place being read, and otherwise where it was left.
   */
  readerViewModeChosen: (
    viewMode: ReaderViewMode,
    translationLocation?: ReaderLocation,
  ) =>
    ({ type: "readerViewModeChosen", viewMode, translationLocation }) as const,
  /** The user moved to another place in the translation-only view; `matchIndex` is the search result chosen there, if any. */
  readerTranslationJumped: (
    location: ReaderLocation,
    matchIndex: number | null = null,
  ) => ({ type: "readerTranslationJumped", location, matchIndex }) as const,
  /** The place the translation-only view shows, as it reported it on a page turn or a scroll. */
  readerTranslationLocationReported: (location: ReaderLocation) =>
    ({ type: "readerTranslationLocationReported", location }) as const,
  /** The user paired the book with another document of the project as its translation, or removed the pairing with null. */
  readerTranslationChosen: (
    projectId: string,
    mediaFileId: string,
    translationMediaFileId: string | null,
  ) =>
    ({
      type: "readerTranslationChosen",
      projectId,
      mediaFileId,
      translationMediaFileId,
    }) as const,
  /** The user asked to combine the book and its paired translation into a bilingual ebook, which opens the dialog about doing so. */
  readerCombineRequested: () => ({ type: "readerCombineRequested" }) as const,
  /** The user closed the dialog about combining the book and its translation. */
  readerCombineDialogClosed: () =>
    ({ type: "readerCombineDialogClosed" }) as const,
  /** The user moved to another place in the book, as by the contents or the progress bar. */
  readerJumped: (mediaFileId: string, location: ReaderLocation) =>
    ({ type: "readerJumped", mediaFileId, location }) as const,
  /** The user chose a search result, which lies at `location`. */
  readerMatchChosen: (
    mediaFileId: string,
    index: number,
    location: ReaderLocation,
  ) => ({ type: "readerMatchChosen", mediaFileId, index, location }) as const,
  readerPanelOpened: (panel: ReaderPanel) =>
    ({ type: "readerPanelOpened", panel }) as const,
  readerPanelToggled: (panel: ReaderPanel) =>
    ({ type: "readerPanelToggled", panel }) as const,
  readerPanelClosed: () => ({ type: "readerPanelClosed" }) as const,
  readerChromeToggled: () => ({ type: "readerChromeToggled" }) as const,
  readerChromeShown: () => ({ type: "readerChromeShown" }) as const,
  /** Hides the toolbar and the progress bar, unless a panel is open. */
  readerChromeHidden: () => ({ type: "readerChromeHidden" }) as const,
  readerSearchChanged: (query: string) =>
    ({ type: "readerSearchChanged", query }) as const,
  /** The paragraphs near the view, as the reader measured them. */
  readerNearSpanMeasured: (span: ItemSpan | null) =>
    ({ type: "readerNearSpanMeasured", span }) as const,
  /** The page in view in the paged layout, as the reader measured it. */
  readerPageMeasured: (pageInfo: PageInfo) =>
    ({ type: "readerPageMeasured", pageInfo }) as const,
  /** The book's text gained keyboard focus, as one region, so that the keyboard places the lookup cursor in it. */
  readerTextFocused: () => ({ type: "readerTextFocused" }) as const,
  /**
   * The keyboard stepped the lookup cursor through the text, landing at `landing`,
   * or past the end of the chapter or section shown when it is null, with another to move on to in that direction.
   */
  readerCursorStepped: (
    landing: ReaderLocation | null,
    direction: TextDirection,
  ) => ({ type: "readerCursorStepped", landing, direction }) as const,
};

/** An action of the reader. */
export type ReaderScreenAction = ReturnType<
  (typeof readerScreenActions)[keyof typeof readerScreenActions]
>;
