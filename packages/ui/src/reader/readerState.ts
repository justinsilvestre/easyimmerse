import type { ReaderLocation } from "./readingProgress.ts";

export type ReaderPanel = "contents" | "search" | "appearance";

/** What the reader shows, apart from the text's appearance. */
export type ReaderState = {
  /** Where the reader is, as last reported by the visible page or scroll position. */
  location: ReaderLocation;
  /** A location the text should move to. Each jump has a new id, so that jumping twice to one place moves twice. */
  jump: { location: ReaderLocation; id: number };
  panel: ReaderPanel | null;
  /** Whether the toolbar and the progress bar are shown over the text. */
  isChromeVisible: boolean;
  search: { query: string; activeMatchIndex: number | null };
};

export type ReaderAction =
  | { type: "jumped"; location: ReaderLocation }
  | { type: "locationReported"; location: ReaderLocation }
  | { type: "panelOpened"; panel: ReaderPanel }
  | { type: "panelToggled"; panel: ReaderPanel }
  | { type: "panelClosed" }
  | { type: "chromeToggled" }
  | { type: "chromeShown" }
  | { type: "chromeHidden" }
  | { type: "searchChanged"; query: string }
  | { type: "matchChosen"; index: number; location: ReaderLocation };

export function initialReaderState(location: ReaderLocation): ReaderState {
  return {
    location,
    jump: { location, id: 0 },
    panel: null,
    isChromeVisible: true,
    search: { query: "", activeMatchIndex: null },
  };
}

export function updateReader(
  state: ReaderState,
  action: ReaderAction,
): ReaderState {
  switch (action.type) {
    case "jumped":
      return {
        ...state,
        location: action.location,
        jump: { location: action.location, id: state.jump.id + 1 },
      };
    case "locationReported":
      return isSameLocation(state.location, action.location)
        ? state
        : { ...state, location: action.location };
    case "panelOpened":
      return { ...state, panel: action.panel };
    case "panelToggled":
      return {
        ...state,
        panel: state.panel === action.panel ? null : action.panel,
      };
    case "panelClosed":
      return { ...state, panel: null };
    case "chromeToggled":
      return { ...state, isChromeVisible: !state.isChromeVisible };
    case "chromeShown":
      return { ...state, isChromeVisible: true };
    case "chromeHidden":
      return state.panel === null
        ? { ...state, isChromeVisible: false }
        : state;
    case "searchChanged":
      return {
        ...state,
        search: { query: action.query, activeMatchIndex: null },
      };
    case "matchChosen":
      return {
        ...updateReader(state, { type: "jumped", location: action.location }),
        search: { ...state.search, activeMatchIndex: action.index },
      };
  }
}

function isSameLocation(a: ReaderLocation, b: ReaderLocation): boolean {
  return (
    a.chapterIndex === b.chapterIndex &&
    a.paragraphIndex === b.paragraphIndex &&
    a.offset === b.offset
  );
}
