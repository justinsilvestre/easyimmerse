import {
  buildLibraryCoverUrl,
  useGetLibrarySettingsQuery,
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
 * The library management screen, which only library managers reach: every item, published or not,
 * and the way to add media, which sets the library's language while it has no items. A new item opens in the manager's library project, which adding it makes when there is none yet.
 */
export function LibraryManageScreen() {
  const go = useNavigate();
  const dispatch = useAppDispatch();
  const isCreating = useAppSelector(selectIsCreatingLibraryItem);
  const server = useAppSelector(selectServerConfig);
  const listing = useListLibraryItemsQuery();
  const settings = useGetLibrarySettingsQuery();
  const projects = useListProjectsQuery().data?.projects;
  const language = settings.data?.language ?? null;
  return (
    <LibraryManagementView
      status={
        listing.isError || settings.isError
          ? "failed"
          : listing.data && settings.data
            ? "ready"
            : "loading"
      }
      language={language}
      items={listing.data?.items ?? []}
      coverUrlOf={(item) => buildLibraryCoverUrl(server, item)}
      // Adding waits for the projects, so that the item opens in the library project made before.
      addStatus={
        isCreating ? "adding" : projects === undefined ? "waiting" : "ready"
      }
      onAddMedia={(chosen, translationLanguage) => {
        const itemsLanguage = chosen ?? language;
        if (!projects || itemsLanguage === null) return;
        dispatch(
          actions.libraryMediaPickRequested({
            translationLanguage,
            libraryLanguage: itemsLanguage === language ? null : itemsLanguage,
            projectId: libraryProjectOf(projects, itemsLanguage),
          }),
        );
      }}
      onEditItem={(itemId) => go({ type: "editLibraryItem", itemId })}
      onBack={() => go({ type: "openLibrary" })}
    />
  );
}
