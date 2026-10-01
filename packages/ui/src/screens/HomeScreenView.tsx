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
      {loading && (
        <p role="status" className="text-sm text-fg-muted">
          Loading projects…
        </p>
      )}
      {projects.length > 0 && (
        <ProjectList projects={projects} onOpen={onOpenProject} />
      )}
      {projects.length === 0 && !loading && !error && <HomeScreenEmptyState />}
    </ScreenLayout>
  );
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
      className="rounded-lg border border-danger-line bg-danger-soft px-4 py-3 text-sm text-danger-fg"
    >
      {message}
    </p>
  );
}
