import {
  useListProjectsQuery,
  useListReviewCountsQuery,
} from "@easyimmerse/backend";
import { useNavigate } from "../hooks/useNavigate.ts";
import { HomeView, type ProjectListStatus } from "../projects/HomeView.tsx";
import { isOfflineError } from "./isOfflineError.ts";

/** The home screen with the projects the server lists, most recently opened first. */
export function HomeScreen({
  onOpenProject,
  onReviewProject,
  onCreateProject,
  onContinueOffline,
}: {
  onOpenProject: (projectId: string) => void;
  onReviewProject: (projectId: string) => void;
  onCreateProject: () => void;
  onContinueOffline: () => void;
}) {
  const navigate = useNavigate();
  const openDictionaries = () => navigate({ type: "openDictionaries" });
  const { data, isLoading, error } = useListProjectsQuery();
  // Counted afresh on each visit, since what is due depends on the time of day.
  const reviewCounts = useListReviewCountsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  }).data?.projects;
  return (
    <HomeView
      status={statusOf(isLoading, error)}
      projects={data?.projects ?? []}
      reviewCounts={reviewCounts ?? []}
      onOpenProject={onOpenProject}
      onReviewProject={onReviewProject}
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
