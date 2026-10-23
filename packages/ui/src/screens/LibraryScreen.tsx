import {
  buildLibraryCoverUrl,
  useGetCurrentPrincipalQuery,
  useListLibraryItemsQuery,
} from "@easyimmerse/backend";
import {
  actions,
  libraryItemsShown,
  libraryLanguagesOf,
  libraryTagsOf,
  selectLibraryBrowseFilter,
  selectServerConfig,
} from "@easyimmerse/state";
import type { LibraryItem } from "@easyimmerse/types";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { useNavigate } from "../hooks/useNavigate.ts";
import { canManageLibrary } from "../library/canManageLibrary.ts";
import { LibraryView } from "../library/LibraryView.tsx";

const noItems: readonly LibraryItem[] = [];

/**
 * The server's library, filtered by language and tags as the store keeps the filter.
 * A library manager sees every item, published or not, and the way to the library management screen.
 */
export function LibraryScreen() {
  const dispatch = useAppDispatch();
  const go = useNavigate();
  const listing = useListLibraryItemsQuery();
  const filter = useAppSelector(selectLibraryBrowseFilter);
  const server = useAppSelector(selectServerConfig);
  const principal = useGetCurrentPrincipalQuery("self").data;
  const items = listing.data?.items ?? noItems;
  return (
    <LibraryView
      status={listing.isError ? "failed" : listing.data ? "ready" : "loading"}
      items={libraryItemsShown(items, filter)}
      languages={libraryLanguagesOf(items)}
      tags={libraryTagsOf(items)}
      filter={filter}
      canManage={canManageLibrary(principal)}
      coverUrlOf={(item) =>
        server && item.has_cover ? buildLibraryCoverUrl(server, item.id) : null
      }
      onChooseLanguage={(language) =>
        dispatch(actions.libraryLanguageChosen(language))
      }
      onToggleTag={(tag) => dispatch(actions.libraryTagToggled(tag))}
      onOpenItem={(itemId) => go({ type: "openLibraryItem", itemId })}
      onManage={() => go({ type: "manageLibrary" })}
      onBack={() => go({ type: "goHome" })}
    />
  );
}
