import {
  buildLibraryCoverUrl,
  useListLibraryItemsQuery,
  useListProjectsQuery,
} from "@easyimmerse/backend";
import {
  actions,
  selectIsCreatingLibraryItem,
  selectServerConfig,
} from "@easyimmerse/state";
import { libraryProjectOf } from "../../lib/library/libraryProjectOf.ts";
import { useAppDispatch } from "../../useAppDispatch.ts";
import { useAppSelector } from "../../useAppSelector.ts";
import { useNavigate } from "../../useNavigate.ts";
import { LibraryManagementView } from "./LibraryManagementView.tsx";

/**
 * The library management screen, which only library managers reach: every item, published or not, and the way to add media.
 * A new item opens in the manager's library project for its language, which adding it makes when there is none yet.
 */
export function LibraryManageScreen() {
  const go = useNavigate();
  const dispatch = useAppDispatch();
  const isCreating = useAppSelector(selectIsCreatingLibraryItem);
  const server = useAppSelector(selectServerConfig);
  const listing = useListLibraryItemsQuery();
  const projects = useListProjectsQuery().data?.projects;
  return (
    <LibraryManagementView
      status={listing.isError ? "failed" : listing.data ? "ready" : "loading"}
      items={listing.data?.items ?? []}
      coverUrlOf={(item) => buildLibraryCoverUrl(server, item)}
      // Adding waits for the projects, so that the item opens in the library project made before.
      addStatus={
        isCreating ? "adding" : projects === undefined ? "waiting" : "ready"
      }
      onAddMedia={(languages) =>
        projects &&
        dispatch(
          actions.libraryMediaPickRequested({
            ...languages,
            projectId: libraryProjectOf(projects, {
              language: languages.language,
            }),
          }),
        )
      }
      onEditItem={(itemId) => go({ type: "editLibraryItem", itemId })}
      onBack={() => go({ type: "openLibrary" })}
    />
  );
}
