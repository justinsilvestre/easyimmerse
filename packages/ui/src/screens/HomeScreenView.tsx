import type { ProjectSummary } from "@easyimmerse/types";
import type { ReactNode } from "react";
import { Button } from "../components/Button.tsx";
import { EmptyState } from "../components/EmptyState.tsx";
import { ProjectList } from "../components/ProjectList.tsx";
import { ScreenLayout } from "../components/ScreenLayout.tsx";

/** Lists the user's projects, most recently opened first, and offers to create a new one. */
export function HomeScreenView({
  projects,
  loading,
  error,
  onOpenProject,
  onCreateProject,
  headerActions,
}: {
  projects: readonly ProjectSummary[];
  loading: boolean;
  error: string | null;
  onOpenProject: (projectId: string) => void;
  onCreateProject: () => void;
  headerActions?: ReactNode;
}) {
  return (
    <ScreenLayout headerActions={headerActions}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <Button variant="primary" onClick={onCreateProject}>
          Create new project
        </Button>
      </div>
      {error && <HomeScreenError message={error} />}
      {loading ? (
        <p role="status" className="text-sm text-gray-500">
          Loading projects…
        </p>
      ) : (
        <HomeScreenProjects
          projects={projects}
          showsEmptyState={!error}
          onOpenProject={onOpenProject}
        />
      )}
    </ScreenLayout>
  );
}

function HomeScreenProjects({
  projects,
  showsEmptyState,
  onOpenProject,
}: {
  projects: readonly ProjectSummary[];
  showsEmptyState: boolean;
  onOpenProject: (projectId: string) => void;
}) {
  if (projects.length > 0)
    return <ProjectList projects={projects} onOpen={onOpenProject} />;
  return showsEmptyState ? <HomeScreenEmptyState /> : null;
}

function HomeScreenEmptyState() {
  return (
    <EmptyState title="No projects yet">
      Create your first project to start learning from your own videos, audio,
      and books.
    </EmptyState>
  );
}

function HomeScreenError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
    >
      {message}
    </p>
  );
}
