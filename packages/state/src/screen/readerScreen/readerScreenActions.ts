import type { ReaderLocation } from "../../storedPlaces/readingLocation.ts";
import type { ItemSpan } from "../itemSpan.ts";
import type { ReaderPanel } from "./readerScreenState.ts";

/** The action creators of the reader: its jumps, panels, chrome and search, and the paragraphs it measured near the view. */
export const readerScreenActions = {
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
};

/** An action of the reader. */
export type ReaderScreenAction = ReturnType<
  (typeof readerScreenActions)[keyof typeof readerScreenActions]
>;
