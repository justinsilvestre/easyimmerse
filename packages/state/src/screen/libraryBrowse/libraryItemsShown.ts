import type { LibraryItem } from "@easyimmerse/types";
import type { LibraryBrowseFilter } from "./libraryBrowseFilter.ts";

/** Returns the items the filter keeps: those in its language, when it names one, that carry every tag it has chosen. */
export function libraryItemsShown(
  items: readonly LibraryItem[],
  { language, tags }: LibraryBrowseFilter,
): readonly LibraryItem[] {
  return items.filter(
    (item) =>
      (language === null || item.language === language) &&
      tags.every((tag) => item.tags.includes(tag)),
  );
}
