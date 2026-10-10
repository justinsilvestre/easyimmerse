import type { ItemSpan } from "../itemSpan.ts";

export type ReaderPanel = "contents" | "search" | "appearance";

/** The reader's own state. Its place in the book is the stored reading location. */
export type ReaderScreenState = {
  /** Counts the jumps, so that jumping twice to one place moves the text twice. */
  jumpCount: number;
  panel: ReaderPanel | null;
  /** Whether the toolbar and the progress bar are shown over the text. */
  isChromeVisible: boolean;
  search: { query: string; activeMatchIndex: number | null };
  /** The paragraphs in view or within one screen of it, as last measured; null until measured, or where the browser cannot measure them. */
  nearSpan: ItemSpan | null;
};

export const initialReaderScreen: ReaderScreenState = {
  jumpCount: 0,
  panel: null,
  isChromeVisible: true,
  search: { query: "", activeMatchIndex: null },
  nearSpan: null,
};
