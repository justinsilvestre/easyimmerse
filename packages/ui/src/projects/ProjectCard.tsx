import type { ProjectSummary } from "@easyimmerse/types";
import { ChevronRight, Film, Layers } from "lucide-react";
import { useId } from "react";
import { Badge } from "../components/Badge.tsx";
import { pluralize } from "../components/pluralize.ts";
import { formatRelativeDate } from "./formatRelativeDate.ts";
import { languageName } from "./languages.ts";

/** One project on the home screen, with its language, size, and when it was last opened. */
export function ProjectCard({
  project,
  onOpen,
}: {
  project: ProjectSummary;
  onOpen: (projectId: string) => void;
}) {
  const nameId = useId();
  const detailsId = useId();
  return (
    <button
      type="button"
      aria-labelledby={nameId}
      aria-describedby={detailsId}
      onClick={() => onOpen(project.id)}
      className="group flex w-full items-center gap-4 rounded-lg border border-line bg-surface px-4 py-3 text-left hover:border-line-strong hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent-soft text-sm font-semibold text-accent-fg uppercase">
        {project.target_language}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span id={nameId} className="truncate font-medium">
          {project.name}
        </span>
        <span
          id={detailsId}
          className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted"
        >
          <Badge>{languageName(project.target_language)}</Badge>
          <span className="flex items-center gap-1">
            <Film className="size-3" aria-hidden />
            {pluralize(project.media_count, "media file")}
          </span>
          <span className="flex items-center gap-1">
            <Layers className="size-3" aria-hidden />
            {pluralize(project.flashcard_count, "flashcard")}
          </span>
          <span>Opened {formatRelativeDate(project.last_opened_at_ms)}</span>
        </span>
      </span>
      <ChevronRight
        className="size-4 shrink-0 text-fg-faint group-hover:text-fg"
        aria-hidden
      />
    </button>
  );
}
