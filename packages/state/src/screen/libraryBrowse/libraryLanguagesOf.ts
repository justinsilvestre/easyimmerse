import type { LibraryItem } from "@easyimmerse/types";

/** Returns the language of every item, each once, in alphabetical order, for the library screen's language select. */
export function libraryLanguagesOf(items: readonly LibraryItem[]): string[] {
  const languages = new Set(items.map((item) => item.language));
  return [...languages].sort((left, right) => left.localeCompare(right));
}
