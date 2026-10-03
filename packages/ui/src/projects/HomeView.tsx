import { BookOpen, FolderOpen, Plus } from "lucide-react";
import { Button } from "../components/Button.tsx";
import { EmptyState } from "../components/EmptyState.tsx";
import { HelpLink } from "../components/HelpLink.tsx";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { ProjectCard, type ProjectCardData } from "./ProjectCard.tsx";

/** How the project list is coming along: `offline` means no server answers, so only local work can continue. */
export type ProjectListStatus = "loading" | "ready" | "failed" | "offline";

/** The home screen: the recent projects, most recently opened first, and the way to a new one. */
export function HomeView({
  status,
  projects,
  onOpenProject,
  onCreateProject,
  onContinueOffline,
  onOpenDictionaries,
}: {
  status: ProjectListStatus;
  projects: readonly ProjectCardData[];
  onOpenProject: (projectId: string) => void;
  onCreateProject: () => void;
  onContinueOffline: () => void;
  onOpenDictionaries: () => void;
}) {
  return (
    <ScreenLayout
      headerActions={
        <>
          <Button variant="subtle" onClick={onOpenDictionaries}>
            <BookOpen className="size-4" aria-hidden />
            Dictionaries
          </Button>
          <HelpLink />
        </>
      }
    >
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Projects</h1>
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
        onOpenProject={onOpenProject}
        onCreateProject={onCreateProject}
        onContinueOffline={onContinueOffline}
      />
    </ScreenLayout>
  );
}

function Projects({
  status,
  projects,
  onOpenProject,
  onCreateProject,
  onContinueOffline,
}: {
  status: ProjectListStatus;
  projects: readonly ProjectCardData[];
  onOpenProject: (projectId: string) => void;
  onCreateProject: () => void;
  onContinueOffline: () => void;
}) {
  switch (status) {
    case "loading":
      return <p className="text-sm text-fg-muted">Loading projects…</p>;
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
              <ProjectCard project={project} onOpen={onOpenProject} />
            </li>
          ))}
        </ul>
      );
  }
}
