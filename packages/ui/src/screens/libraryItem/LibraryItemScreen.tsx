import {
  buildLibraryCoverUrl,
  useAddLibraryItemMutation,
  useGetCurrentPrincipalQuery,
  useGetLibraryItemQuery,
  useListProjectsQuery,
} from "@easyimmerse/backend";
import {
  actions,
  canManageLibrary,
  libraryFailureMessage,
  selectLibraryAddTarget,
  selectServerConfig,
} from "@easyimmerse/state";
import { LoadingStatus, Skeleton } from "../../components/common/Skeleton.tsx";
import { ScreenLayout } from "../../layout/ScreenLayout.tsx";
import { useAppDispatch } from "../../useAppDispatch.ts";
import { useAppSelector } from "../../useAppSelector.ts";
import { useNavigate } from "../../useNavigate.ts";
import { LibraryItemView } from "./LibraryItemView.tsx";

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
  const chosen = useAppSelector((state) =>
    selectLibraryAddTarget(state, itemId),
  );
  const back = () => go({ type: "openLibrary" });
  if (item.isError)
    return (
      <ScreenLayout onBack={back} backLabel="Library">
        <p role="alert">
          This library item couldn't be loaded. Go back to the library and try
          again.
        </p>
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
  const { language } = item.data;
  const projectsInLanguage = projects.filter(
    ({ settings }) => settings.target_language === language,
  );
  return (
    <LibraryItemView
      item={item.data}
      coverUrl={buildLibraryCoverUrl(server, item.data)}
      projects={projectsInLanguage}
      chosenProjectId={
        chosen === undefined ? (projectsInLanguage[0]?.id ?? null) : chosen
      }
      canManage={canManageLibrary(principal)}
      isAdding={added.isLoading}
      addFailure={
        added.isError
          ? libraryFailureMessage(
              added.error,
              `“${item.data.title}” couldn't be added to the project. Try again in a moment.`,
              `“${item.data.title}”`,
            )
          : null
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
      onChooseProject={(projectId) =>
        dispatch(actions.libraryAddTargetChosen(itemId, projectId))
      }
      onEdit={() => go({ type: "editLibraryItem", itemId })}
      onBack={back}
    />
  );
}
