import { useListProjectsQuery } from "@easyimmerse/backend";
import { Button } from "../components/Button.tsx";
import { HelpLink } from "../components/HelpLink.tsx";
import { ProjectList } from "../components/ProjectList.tsx";
import { ScreenLayout } from "../components/ScreenLayout.tsx";

/** The project id the media screen opens with when no server can list projects. */
const offlineProjectId = "offline";

export function HomeScreen({
  onOpenProject,
}: {
  onOpenProject: (projectId: string) => void;
}) {
  const { data, isLoading, error } = useListProjectsQuery();
  return (
    <ScreenLayout headerActions={<HelpLink />}>
      <h1 className="text-xl font-semibold">Projects</h1>
      {isLoading && <p>Loading projects...</p>}
      {error && <p role="alert">Could not load the projects.</p>}
      {isOffline(error) && (
        <Button onClick={() => onOpenProject(offlineProjectId)}>
          Continue offline
        </Button>
      )}
      {data && <ProjectList projects={data.projects} onOpen={onOpenProject} />}
    </ScreenLayout>
  );
}

function isOffline(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === "OFFLINE"
  );
}
