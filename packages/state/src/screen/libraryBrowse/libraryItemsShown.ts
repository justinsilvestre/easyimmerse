import type { LibraryItem } from "@easyimmerse/types";
import type { LibraryBrowseFilter } from "./libraryBrowseFilter.ts";

/** Returns the items the filter keeps: those that carry every tag it has chosen. */
export function libraryItemsShown(
  items: readonly LibraryItem[],
  { tags }: LibraryBrowseFilter,
): readonly LibraryItem[] {
  return items.filter((item) => tags.every((tag) => item.tags.includes(tag)));
}
