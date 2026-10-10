import { useListProjectsQuery } from "@easyimmerse/backend";
import { useNavigate } from "../hooks/useNavigate.ts";
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
  const navigate = useNavigate();
  const openDictionaries = () => navigate({ type: "openDictionaries" });
  const { data, isLoading, error } = useListProjectsQuery();
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
  if (isOfflineError(error)) return "offline";
  if (error) return "failed";
  return "ready";
}
