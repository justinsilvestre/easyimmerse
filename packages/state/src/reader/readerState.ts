/** A place in a document: the chapter shown and the paragraph at the top of the reading area. */
export type ReadingPosition = { chapterIndex: number; paragraphIndex: number };

/** The open document's bytes, when the browser holds them, and the last reading position. */
export type ReaderState = {
  /** The bytes of a document the browser stored, which the server cannot read. Null until they are read. */
  documentBytes: { mediaId: string; bytes: Uint8Array } | null;
  position: ReadingPosition | null;
};

export const initialReaderState: ReaderState = {
  documentBytes: null,
  position: null,
};
