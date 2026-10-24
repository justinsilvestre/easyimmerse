import type { LibraryItem, Project } from "@easyimmerse/types";
import { languageName } from "../formatting/languages.ts";

/**
 * Returns the project in which a library manager opens an item to prepare its words: the project for the item's language
 * that adding a library item makes, such as "German library", or null while they have none, for the server to make one.
 * Opening the item there again finds the media file added before.
 */
export function libraryProjectOf(
  projects: readonly Project[],
  item: Pick<LibraryItem, "language">,
): string | null {
  const name = `${languageName(item.language)} library`;
  const project = projects.find(
    ({ settings }) =>
      settings.name === name && settings.target_language === item.language,
  );
  return project?.id ?? null;
}
