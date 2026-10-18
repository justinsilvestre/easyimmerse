import type { ReaderLocation } from "../../storedPlaces/readingLocation.ts";
import type { ItemSpan } from "../itemSpan.ts";
import type { AnchorRect } from "../lookup/lookupState.ts";

export type ReaderPanel = "contents" | "search" | "appearance" | "translation";

/**
 * Which text the reader shows: the book alone, its paired translation alone,
 * or, once the two are aligned, both together: each passage over its translation (interlinear), or side by side (parallel).
 */
export type ReaderViewMode =
  | "target"
  | "translation"
  | "interlinear"
  | "parallel";

/**
 * How far the book's translation is ready to be shown, as `selectReaderTranslationStatus` derives it: not at all,
 * while none is paired or it is still loading; alone, once it has loaded; or also together with the book, once it is aligned with it.
 */
export type ReaderTranslationStatus = "absent" | "unaligned" | "aligned";

/** The page of the chapter in view, counted from zero, and how many pages the chapter fills. */
export type PageInfo = { page: number; pageCount: number };

/**
 * The pop-up that shows the translation of one sentence of the book: where the word it was opened on lies,
 * and where that word is drawn, beside which the pop-up stands; null when it was opened from the keyboard, which puts it at the foot of the window.
 */
export type ReaderTranslationPopup = {
  location: ReaderLocation;
  anchor: AnchorRect | null;
};

/** The reader's own state. Its place in the book is the stored reading location. */
export type ReaderScreenState = {
  /** The view the user chose. The view shown can differ, as `shownReaderViewMode` describes. */
  viewMode: ReaderViewMode;
  /** The place in the translation-only view. It is not stored, since the stored place is the book's own. */
  translationLocation: ReaderLocation;
  /** Counts the jumps, so that jumping twice to one place moves the text twice. */
  jumpCount: number;
  panel: ReaderPanel | null;
  /** Whether the toolbar and the progress bar are shown over the text. */
  isChromeVisible: boolean;
  search: { query: string; activeMatchIndex: number | null };
  /** The paragraphs in view or within one screen of it, as last measured; null until measured, or where the browser cannot measure them. */
  nearSpan: ItemSpan | null;
  /** The page in view in the paged layout, as last measured; null until measured. */
  pageInfo: PageInfo | null;
  /** The translation of a sentence shown over the text, or null while none is. */
  translationPopup: ReaderTranslationPopup | null;
};

export const initialReaderScreen: ReaderScreenState = {
  viewMode: "target",
  translationLocation: { chapterIndex: 0, paragraphIndex: 0, offset: 0 },
  jumpCount: 0,
  panel: null,
  isChromeVisible: true,
  search: { query: "", activeMatchIndex: null },
  nearSpan: null,
  pageInfo: null,
  translationPopup: null,
};
