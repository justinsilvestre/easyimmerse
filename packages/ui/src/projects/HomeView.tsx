import { BookOpen, FolderOpen, Plus } from "lucide-react";
import { Button } from "../components/Button.tsx";
import { EmptyState } from "../components/EmptyState.tsx";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { ProjectCard, type ProjectCardData } from "./ProjectCard.tsx";

/** The home screen: the recent projects, most recently opened first, and the way to a new one. */
export function HomeView({
  projects,
  onOpenProject,
  onCreateProject,
  onOpenDictionaries,
  onOpenHelp,
}: {
  projects: readonly ProjectCardData[];
  onOpenProject: (projectId: string) => void;
  onCreateProject: () => void;
  onOpenDictionaries: () => void;
  onOpenHelp: () => void;
}) {
  return (
    <ScreenLayout
      headerActions={
        <>
          <Button variant="subtle" onClick={onOpenDictionaries}>
            <BookOpen className="size-4" aria-hidden />
            Dictionaries
          </Button>
          <Button variant="subtle" onClick={onOpenHelp}>
            Help
          </Button>
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
      {projects.length === 0 ? (
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
      ) : (
        <ul aria-label="Projects" className="flex flex-col gap-2">
          {projects.map((project) => (
            <li key={project.id}>
              <ProjectCard project={project} onOpen={onOpenProject} />
            </li>
          ))}
        </ul>
      )}
    </ScreenLayout>
  );
}
