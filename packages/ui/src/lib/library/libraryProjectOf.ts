import type { Project } from "@easyimmerse/types";

/**
 * Returns the project in which a library manager opens items to prepare their words: the project named "Library"
 * in the library's language that adding a library item makes, or null while they have none, for the server to make one.
 * Opening an item there again finds the media file added before.
 */
export function libraryProjectOf(
  projects: readonly Project[],
  libraryLanguage: string,
): string | null {
  const project = projects.find(
    ({ settings }) =>
      settings.name === "Library" &&
      settings.target_language === libraryLanguage,
  );
  return project?.id ?? null;
}
