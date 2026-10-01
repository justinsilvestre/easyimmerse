import { mediaExtensions } from "../guessMediaKind.ts";
import type { FilePickPurpose } from "./chosenFile.ts";

/** The file extensions, with the dot, that the file dialog offers for each purpose. */
export const acceptedExtensions: Record<
  FilePickPurpose["kind"],
  readonly string[]
> = {
  media: mediaExtensions.map((extension) => `.${extension}`),
  subtitles: [".srt", ".vtt"],
  dictionary: [".zip"],
};
