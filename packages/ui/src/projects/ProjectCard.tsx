import type { Project, ReviewCounts } from "@easyimmerse/types";
import { ChevronRight, Film, GraduationCap, Layers } from "lucide-react";
import { Badge } from "../components/Badge.tsx";
import { Button } from "../components/Button.tsx";
import { pluralize } from "../components/pluralize.ts";
import { Skeleton } from "../components/Skeleton.tsx";
import { formatRelativeDate } from "./formatRelativeDate.ts";
import { languageName } from "./languages.ts";

/**
 * One project on the home screen, with its language, size, and when it was last opened.
 * Beside it, a button opens its review directly: to review the cards due, with their count, or to learn new cards when none is due.
 */
export function ProjectCard({
  project,
  review,
  onOpen,
  onReview,
}: {
  project: Project;
  /** What waits in the project's review today, or null while that is not known. */
  review: ReviewCounts | null;
  onOpen: (projectId: string) => void;
  onReview: (projectId: string) => void;
}) {
  const { name, target_language: language } = project.settings;
  return (
    <div className="flex items-center rounded-lg border border-line bg-surface has-[button:hover]:border-line-strong">
      <button
        type="button"
        onClick={() => onOpen(project.id)}
        className="group flex min-w-0 flex-1 items-center gap-4 rounded-lg px-4 py-3 text-left hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent-soft text-sm font-semibold text-accent-fg uppercase"
        >
          {language}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate font-medium">{name}</span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
            <Badge>{languageName(language)}</Badge>
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
      {review && (
        <ReviewButton
          projectId={project.id}
          review={review}
          onReview={onReview}
        />
      )}
    </div>
  );
}

/**
 * Opens the project's review: with the count of cards due while any is, those being learned included,
 * or to learn new cards while none is due and some are left for today. Nothing shows otherwise.
 */
function ReviewButton({
  projectId,
  review,
  onReview,
}: {
  projectId: string;
  review: ReviewCounts;
  onReview: (projectId: string) => void;
}) {
  const dueCount = review.due_count + review.learning_count;
  if (dueCount === 0 && review.new_count === 0) return null;
  return (
    <Button
      size="sm"
      variant={dueCount > 0 ? "primary" : "secondary"}
      className="mr-3 shrink-0"
      onClick={() => onReview(projectId)}
    >
      <GraduationCap className="size-3.5" aria-hidden />
      {dueCount > 0 ? (
        <>
          Review
          <span className="tabular-nums opacity-80">{dueCount} due</span>
        </>
      ) : (
        "Learn"
      )}
    </Button>
  );
}

/** A placeholder in the shape of a project card, shown while the projects load. */
export function ProjectCardSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-line bg-surface px-4 py-3">
      <Skeleton className="size-10 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}
