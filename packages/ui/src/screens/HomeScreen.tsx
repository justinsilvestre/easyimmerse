import { useListProjectsQuery } from "@easyimmerse/backend";
import { actions } from "@easyimmerse/state";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { HomeView, type ProjectListStatus } from "../projects/HomeView.tsx";
import { isOfflineError } from "./isOfflineError.ts";

/** The home screen with the projects the server lists, most recently opened first. */
export function HomeScreen({
  onOpenProject,
  onCreateProject,
  onContinueOffline,
}: {
  onOpenProject: (projectId: string) => void;
  onCreateProject: () => void;
  onContinueOffline: () => void;
}) {
  const dispatch = useAppDispatch();
  const { data, isLoading, error } = useListProjectsQuery();
  return (
    <HomeView
      status={statusOf(isLoading, error)}
      projects={data?.projects ?? []}
      onOpenProject={onOpenProject}
      onCreateProject={onCreateProject}
      onContinueOffline={onContinueOffline}
      onOpenDictionaries={() =>
        dispatch(
          actions.notificationRequested(
            "Managing dictionaries is not available yet.",
          ),
        )
      }
    />
  );
}

function statusOf(isLoading: boolean, error: unknown): ProjectListStatus {
  if (isLoading) return "loading";
  if (isOfflineError(error)) return "offline";
  if (error) return "failed";
  return "ready";
}
