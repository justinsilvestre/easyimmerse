import type { Project, ReviewCounts } from "@easyimmerse/types";
import { FolderOpen, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "../../components/common/Button.tsx";
import { EmptyState } from "../../components/common/EmptyState.tsx";
import { LoadingStatus } from "../../components/common/Skeleton.tsx";
import { ScreenLayout } from "../../layout/ScreenLayout.tsx";
import { HomeLibrarySection } from "./HomeLibrarySection.tsx";
import { ProjectCard, ProjectCardSkeleton } from "./ProjectCard.tsx";

/** How the project list is coming along: `offline` means no server answers, so only local work can continue. */
export type ProjectListStatus = "loading" | "ready" | "failed" | "offline";

/**
 * The home screen: a suggestion above all else, if there is one, then the server's library, then the recent projects, most recently opened first, with the way to a new one.
 * The library is left out while no server answers.
 */
export function HomeView({
  status,
  projects,
  reviewCounts,
  onOpenProject,
  onReviewProject,
  onCreateProject,
  onContinueOffline,
  onOpenLibrary,
  onManageLibrary,
  suggestion,
}: {
  status: ProjectListStatus;
  projects: readonly Project[];
  /** What waits in each project's review today. A project left out shows no way to review it. */
  reviewCounts: readonly ReviewCounts[];
  onOpenProject: (projectId: string) => void;
  /** Opens a project's review directly, without its screen. */
  onReviewProject: (projectId: string) => void;
  onCreateProject: () => void;
  onContinueOffline: () => void;
  onOpenLibrary: () => void;
  /** Opens the library management screen. Null for someone who cannot manage the library. */
  onManageLibrary: (() => void) | null;
  /** A card suggesting another easyImmerse component, such as a way to back up the work. */
  suggestion?: ReactNode;
}) {
  return (
    <ScreenLayout>
      <h1 className="sr-only">Home</h1>
      {suggestion}
      {status !== "offline" && (
        <HomeLibrarySection
          onOpenLibrary={onOpenLibrary}
          onManageLibrary={onManageLibrary}
        />
      )}
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">Projects</h2>
        {projects.length > 0 && (
          <Button variant="primary" onClick={onCreateProject}>
            <Plus className="size-4" aria-hidden />
            New project
          </Button>
        )}
      </div>
      <Projects
        status={status}
        projects={projects}
        reviewCounts={reviewCounts}
        onOpenProject={onOpenProject}
        onReviewProject={onReviewProject}
        onCreateProject={onCreateProject}
        onContinueOffline={onContinueOffline}
      />
    </ScreenLayout>
  );
}

function Projects({
  status,
  projects,
  reviewCounts,
  onOpenProject,
  onReviewProject,
  onCreateProject,
  onContinueOffline,
}: {
  status: ProjectListStatus;
  projects: readonly Project[];
  reviewCounts: readonly ReviewCounts[];
  onOpenProject: (projectId: string) => void;
  onReviewProject: (projectId: string) => void;
  onCreateProject: () => void;
  onContinueOffline: () => void;
}) {
  switch (status) {
    case "loading":
      return (
        <LoadingStatus label="Loading projects" className="flex flex-col gap-2">
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
        </LoadingStatus>
      );
    case "failed":
      return <p role="alert">Could not load the projects.</p>;
    case "offline":
      return (
        <EmptyState
          title="No server to load projects from"
          description="You can keep working with the files on this device."
          actions={
            <Button onClick={onContinueOffline}>Continue offline</Button>
          }
        />
      );
    case "ready":
      if (projects.length === 0)
        return (
          <EmptyState
            icon={<FolderOpen className="size-8" />}
            title="No projects yet"
            description="A project collects the media you learn from, in one language, and the flashcards you make from it."
            actions={
              <Button variant="primary" onClick={onCreateProject}>
                <Plus className="size-4" aria-hidden />
                Create a project
              </Button>
            }
          />
        );
      return (
        <ul aria-label="Projects" className="flex flex-col gap-2">
          {projects.map((project) => (
            <li key={project.id}>
              <ProjectCard
                project={project}
                review={
                  reviewCounts.find(
                    ({ project_id }) => project_id === project.id,
                  ) ?? null
                }
                onOpen={onOpenProject}
                onReview={onReviewProject}
              />
            </li>
          ))}
        </ul>
      );
  }
}
