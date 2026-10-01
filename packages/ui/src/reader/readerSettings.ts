export type ReaderFontSize = "small" | "medium" | "large";

export type ReaderFontFamily = "serif" | "sans";

/** How the reader displays the text of a document. */
export type ReaderSettings = {
  fontSize: ReaderFontSize;
  fontFamily: ReaderFontFamily;
};

export const defaultReaderSettings: ReaderSettings = {
  fontSize: "medium",
  fontFamily: "sans",
};
