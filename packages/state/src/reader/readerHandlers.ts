import type { AppState } from "../appState.ts";
import type { UpdateHandlers } from "../updateHandlers.ts";
import type { ReaderState } from "./readerState.ts";

export const readerHandlers = {
  documentBytesRead: (state, { mediaId, bytes }) => [
    isMediaOpen(state, mediaId)
      ? withReader(state, { documentBytes: { mediaId, bytes } })
      : state,
    [],
  ],
  readingPositionChanged: (state, { mediaId, position }) => [
    isMediaOpen(state, mediaId) ? withReader(state, { position }) : state,
    [],
  ],
} satisfies Partial<UpdateHandlers>;

function withReader(state: AppState, changes: Partial<ReaderState>): AppState {
  return { ...state, reader: { ...state.reader, ...changes } };
}

/** Tells whether the media is still open, so that a late result for other media is ignored. */
function isMediaOpen(state: AppState, mediaId: string): boolean {
  return state.screen.kind === "media" && state.screen.mediaId === mediaId;
}
