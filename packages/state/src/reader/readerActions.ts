import type { ReadingPosition } from "./readerState.ts";

export const readerActions = {
  documentBytesRead: (mediaId: string, bytes: Uint8Array) =>
    ({ type: "documentBytesRead", mediaId, bytes }) as const,
  readingPositionChanged: (mediaId: string, position: ReadingPosition) =>
    ({ type: "readingPositionChanged", mediaId, position }) as const,
};
