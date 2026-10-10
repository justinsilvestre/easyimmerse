import type { AppAction } from "../../app/appAction.ts";
import type { ReaderScreenState } from "./readerScreenState.ts";

/** Opens and closes the reader's panels and chrome, keeps its search and measured span, and counts its jumps. */
export function updateReaderScreen(
  reader: ReaderScreenState,
  action: AppAction,
): ReaderScreenState {
  switch (action.type) {
    case "readerJumped":
      return { ...reader, jumpCount: reader.jumpCount + 1 };
    case "readerMatchChosen":
      return {
        ...reader,
        jumpCount: reader.jumpCount + 1,
        search: { ...reader.search, activeMatchIndex: action.index },
      };
    case "readerPanelOpened":
      return { ...reader, panel: action.panel };
    case "readerPanelToggled":
      return {
        ...reader,
        panel: reader.panel === action.panel ? null : action.panel,
      };
    case "readerPanelClosed":
      return { ...reader, panel: null };
    case "readerChromeToggled":
      return { ...reader, isChromeVisible: !reader.isChromeVisible };
    case "readerChromeShown":
      return { ...reader, isChromeVisible: true };
    case "readerChromeHidden":
      return reader.panel === null
        ? { ...reader, isChromeVisible: false }
        : reader;
    case "readerSearchChanged":
      return {
        ...reader,
        search: { query: action.query, activeMatchIndex: null },
      };
    case "readerNearSpanMeasured":
      return { ...reader, nearSpan: action.span };
    default:
      return reader;
  }
}
