import type { BrowserFileRegistry, PickedMediaFile } from "@easyimmerse/state";
import type { LibrarySubtitles } from "@easyimmerse/types";
import type { LibrarySubtitleFiles } from "./LibraryFilesSection.tsx";

/** The failure of an upload on a platform whose files are not held by a browser. */
export const unreachableFile = {
  status: 404,
  code: "browserFileUnreachable",
  message: "",
};

/** Holds a file the manager picked in the browser's file registry, from which the upload reads it. */
export function pickedFileOf(
  registry: BrowserFileRegistry<File>,
  file: File,
): PickedMediaFile {
  return { name: file.name, source: registry.register(file) };
}

/** Reads subtitle files as text, leaving their format for the server to detect. */
export async function librarySubtitlesOf({
  target,
  translation,
}: LibrarySubtitleFiles): Promise<LibrarySubtitles> {
  return {
    target_text: await target.text(),
    translation_text: translation ? await translation.text() : null,
    format: null,
  };
}
