import {
  buildLibraryCoverUrl,
  useGetCurrentPrincipalQuery,
  useGetLibrarySettingsQuery,
  useListLibraryItemsQuery,
} from "@easyimmerse/backend";
import {
  actions,
  canManageLibrary,
  libraryItemsShown,
  libraryTagsOf,
  selectLibraryBrowseFilter,
  selectServerConfig,
} from "@easyimmerse/state";
import type { LibraryItem } from "@easyimmerse/types";
import { useAppDispatch } from "../../useAppDispatch.ts";
import { useAppSelector } from "../../useAppSelector.ts";
import { useNavigate } from "../../useNavigate.ts";
import { LibraryView } from "./LibraryView.tsx";

const noItems: readonly LibraryItem[] = [];

/**
 * The server's library, filtered by tags as the store keeps the filter.
 * A library manager sees every item, published or not, and the way to the library management screen.
 */
export function LibraryScreen() {
  const dispatch = useAppDispatch();
  const go = useNavigate();
  const listing = useListLibraryItemsQuery();
  const language = useGetLibrarySettingsQuery().data?.language ?? null;
  const filter = useAppSelector(selectLibraryBrowseFilter);
  const server = useAppSelector(selectServerConfig);
  const principal = useGetCurrentPrincipalQuery("self").data;
  const items = listing.data?.items ?? noItems;
  return (
    <LibraryView
      status={listing.isError ? "failed" : listing.data ? "ready" : "loading"}
      language={language}
      items={libraryItemsShown(items, filter)}
      tags={libraryTagsOf(items)}
      filter={filter}
      canManage={canManageLibrary(principal)}
      coverUrlOf={(item) => buildLibraryCoverUrl(server, item)}
      onToggleTag={(tag) => dispatch(actions.libraryTagToggled(tag))}
      onOpenItem={(itemId) => go({ type: "openLibraryItem", itemId })}
      onManage={() => go({ type: "manageLibrary" })}
      onBack={() => go({ type: "goHome" })}
    />
  );
}
