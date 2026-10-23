import {
  buildLibraryCoverUrl,
  useAddLibraryItemMutation,
  useGetCurrentPrincipalQuery,
  useGetLibraryItemQuery,
  useListProjectsQuery,
} from "@easyimmerse/backend";
import { actions, selectServerConfig } from "@easyimmerse/state";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { LoadingStatus, Skeleton } from "../components/Skeleton.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { useNavigate } from "../hooks/useNavigate.ts";
import { canManageLibrary } from "../library/canManageLibrary.ts";
import { LibraryItemView } from "../library/LibraryItemView.tsx";

/**
 * One item of the library, which the person adds to one of their projects in its language, or to a new project made for it.
 * Once added, the item opens in that project.
 */
export function LibraryItemScreen({ itemId }: { itemId: string }) {
  const dispatch = useAppDispatch();
  const go = useNavigate();
  const item = useGetLibraryItemQuery(itemId);
  const projectList = useListProjectsQuery();
  const projects = projectList.data?.projects ?? [];
  const principal = useGetCurrentPrincipalQuery("self").data;
  const server = useAppSelector(selectServerConfig);
  const [add, added] = useAddLibraryItemMutation();
  const back = () => go({ type: "openLibrary" });
  if (item.isError)
    return (
      <ScreenLayout onBack={back} backLabel="Library">
        <p role="alert">This library item could not be loaded.</p>
      </ScreenLayout>
    );
  // The "Add to" choice starts on the first project, so it waits for the projects.
  if (!item.data || projectList.isLoading)
    return (
      <ScreenLayout onBack={back} backLabel="Library">
        <LoadingStatus label="Loading the item" className="flex flex-col gap-4">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </LoadingStatus>
      </ScreenLayout>
    );
  const { language, has_cover } = item.data;
  return (
    <LibraryItemView
      item={item.data}
      coverUrl={
        server && has_cover ? buildLibraryCoverUrl(server, itemId) : null
      }
      projects={projects.filter(
        ({ settings }) => settings.target_language === language,
      )}
      canManage={canManageLibrary(principal)}
      isAdding={added.isLoading}
      addFailure={
        added.isError ? "Could not add the item to the project." : null
      }
      onAdd={(projectId) =>
        add({ itemId, projectId })
          .unwrap()
          .then(
            ({ project_id, media_file_id }) =>
              dispatch(
                actions.openMediaFileRequested(project_id, media_file_id),
              ),
            () => undefined,
          )
      }
      onEdit={() => go({ type: "editLibraryItem", itemId })}
      onBack={back}
    />
  );
}
