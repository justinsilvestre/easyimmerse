import type { DocumentFormat } from "@easyimmerse/types";

const documentFormats: Record<string, DocumentFormat> = {
  ".epub": "epub",
  ".txt": "plain_text",
};

/** The file extensions the media file picker offers: the common video and audio containers, ebooks, and text files. */
export const mediaFileExtensions: readonly string[] = [
  ".mp4",
  ".m4v",
  ".mov",
  ".mkv",
  ".webm",
  ".avi",
  ".ts",
  ".mp3",
  ".m4a",
  ".aac",
  ".flac",
  ".ogg",
  ".oga",
  ".opus",
  ".wav",
  ...Object.keys(documentFormats),
];

/** Tells from the name whether a media file is an ebook or a text file, which opens in the reader rather than the player. */
export function isDocumentFileName(name: string): boolean {
  return documentFormatOf(name) !== null;
}

/** The format to parse a document file as, or null to let the parser detect it. */
export function documentFormatOf(name: string): DocumentFormat | null {
  const extension = name.slice(name.lastIndexOf(".")).toLowerCase();
  return documentFormats[extension] ?? null;
}
