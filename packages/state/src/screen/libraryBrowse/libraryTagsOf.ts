import type { LibraryItem } from "@easyimmerse/types";

/** Returns every tag the items carry, each once, in alphabetical order, for the library screen's chips. */
export function libraryTagsOf(items: readonly LibraryItem[]): string[] {
  const tags = new Set(items.flatMap((item) => item.tags));
  return [...tags].sort((left, right) => left.localeCompare(right));
}
