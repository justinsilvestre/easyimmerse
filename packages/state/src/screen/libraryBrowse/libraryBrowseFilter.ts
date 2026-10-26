import type { AppAction } from "../../app/appAction.ts";
import type { AppRoot } from "../../app/createAppStore.ts";
import { updated } from "../../app/updated.ts";

/** Which library items the library screen shows: those that carry every chosen tag. */
export type LibraryBrowseFilter = {
  tags: readonly string[];
};

/** The filter as the app starts, which shows every item. */
export const initialLibraryBrowseFilter: LibraryBrowseFilter = {
  tags: [],
};

/** Turns tags on and off. The filter outlives the library screen, so that coming back from an item keeps it. */
export function updateLibraryBrowse(
  filter: LibraryBrowseFilter,
  action: AppAction,
) {
  switch (action.type) {
    case "libraryTagToggled":
      return updated({ ...filter, tags: toggled(filter.tags, action.tag) });
    default:
      return updated(filter);
  }
}

/** Returns the library screen's filter. */
export function selectLibraryBrowseFilter(root: AppRoot): LibraryBrowseFilter {
  return root.app.screen.libraryBrowse;
}

function toggled(tags: readonly string[], tag: string): readonly string[] {
  return tags.includes(tag)
    ? tags.filter((each) => each !== tag)
    : [...tags, tag];
}
