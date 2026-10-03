import type { ProjectSummary } from "@easyimmerse/types";
import { ChevronRight, Film, Layers } from "lucide-react";
import { Badge } from "../components/Badge.tsx";
import { formatRelativeDate } from "./formatRelativeDate.ts";
import { languageName } from "./languages.ts";

/** What the home screen shows for a project, beyond the summary the server lists. */
export type ProjectCardData = ProjectSummary & {
  last_opened_at: string;
  media_count: number;
  flashcard_count: number;
};

export function ProjectCard({
  project,
  onOpen,
}: {
  project: ProjectCardData;
  onOpen: (projectId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(project.id)}
      className="group flex w-full items-center gap-4 rounded-lg border border-line bg-surface px-4 py-3 text-left hover:border-line-strong hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent-soft text-sm font-semibold text-accent-fg uppercase">
        {project.language}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate font-medium">{project.name}</span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
          <Badge>{languageName(project.language)}</Badge>
          <span className="flex items-center gap-1">
            <Film className="size-3" aria-hidden />
            {project.media_count} media
          </span>
          <span className="flex items-center gap-1">
            <Layers className="size-3" aria-hidden />
            {project.flashcard_count} flashcards
          </span>
          <span>Opened {formatRelativeDate(project.last_opened_at)}</span>
        </span>
      </span>
      <ChevronRight
        className="size-4 shrink-0 text-fg-faint group-hover:text-fg"
        aria-hidden
      />
    </button>
  );
}
