import {
  buildLibraryCoverUrl,
  useAddLibraryItemMutation,
  useGetCurrentPrincipalQuery,
  useGetLibraryItemQuery,
  useGetLibrarySettingsQuery,
  useListProjectsQuery,
} from "@easyimmerse/backend";
import {
  actions,
  canManageLibrary,
  libraryFailureMessage,
  pathOfRoute,
  selectLibraryAddTarget,
  selectServerConfig,
} from "@easyimmerse/state";
import type { Project } from "@easyimmerse/types";
import { LoadingStatus, Skeleton } from "../../components/common/Skeleton.tsx";
import { ScreenLayout } from "../../layout/ScreenLayout.tsx";
import { useAppDispatch } from "../../useAppDispatch.ts";
import { useAppSelector } from "../../useAppSelector.ts";
import { LibraryItemView } from "./LibraryItemView.tsx";

/**
 * One item of the library, which the person adds to one of their projects in the library's language, or to a new project made for it.
 * Once added, the item opens in that project.
 */
export function LibraryItemScreen({ itemId }: { itemId: string }) {
  const dispatch = useAppDispatch();
  const item = useGetLibraryItemQuery(itemId);
  const settings = useGetLibrarySettingsQuery();
  const projectList = useListProjectsQuery();
  const projects = projectList.data?.projects ?? [];
  const principal = useGetCurrentPrincipalQuery("self").data;
  const server = useAppSelector(selectServerConfig);
  const [add, added] = useAddLibraryItemMutation();
  const chosen = useAppSelector((state) =>
    selectLibraryAddTarget(state, itemId),
  );
  const back = pathOfRoute({ screen: "library" });
  if (item.isError || settings.isError)
    return (
      <ScreenLayout backHref={back} backLabel="Library">
        <p role="alert">
          This library item couldn't be loaded. Go back to the library and try
          again.
        </p>
      </ScreenLayout>
    );
  // The "Add to" choice starts on the first project in the library's language, so it waits for both.
  if (!item.data || !settings.data || projectList.isLoading)
    return (
      <ScreenLayout backHref={back} backLabel="Library">
        <LoadingStatus label="Loading the item" className="flex flex-col gap-4">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </LoadingStatus>
      </ScreenLayout>
    );
  // An item exists only once a library manager has set the library's language.
  const language = settings.data.language ?? "";
  const projectsInLanguage = projects.filter(
    ({ settings }) => settings.target_language === language,
  );
  return (
    <LibraryItemView
      item={item.data}
      libraryLanguage={language}
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
              `“${item.data.title}” couldn't be added to ${targetNameOf(added.originalArgs?.projectId ?? null, projects)}.`,
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
    />
  );
}

/** Names the project an item was being added to, or says it was a new one when none is given. */
function targetNameOf(
  projectId: string | null,
  projects: readonly Project[],
): string {
  if (projectId === null) return "a new project";
  const project = projects.find(({ id }) => id === projectId);
  return project ? `“${project.settings.name}”` : "that project";
}
