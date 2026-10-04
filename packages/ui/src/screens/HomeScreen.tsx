import { useListProjectsQuery } from "@easyimmerse/backend";
import { useNavigationActions } from "../navigationContext.ts";
import { HomeView, type ProjectListStatus } from "../projects/HomeView.tsx";

/** The home screen with the projects the server lists. */
export function HomeScreen({
  onOpenProject,
  onCreateProject,
  onContinueOffline,
}: {
  onOpenProject: (projectId: string) => void;
  onCreateProject: () => void;
  onContinueOffline: () => void;
}) {
  const { data, isLoading, error } = useListProjectsQuery();
  const { openDictionaries } = useNavigationActions();
  return (
    <HomeView
      status={statusOf(isLoading, error)}
      projects={data?.projects ?? []}
      onOpenProject={onOpenProject}
      onCreateProject={onCreateProject}
      onContinueOffline={onContinueOffline}
      onOpenDictionaries={openDictionaries}
    />
  );
}

function statusOf(isLoading: boolean, error: unknown): ProjectListStatus {
  if (isLoading) return "loading";
  if (isOffline(error)) return "offline";
  if (error) return "failed";
  return "ready";
}

function isOffline(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === "OFFLINE"
  );
}
