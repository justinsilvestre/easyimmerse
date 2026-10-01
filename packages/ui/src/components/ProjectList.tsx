import type { ProjectSummary } from "@easyimmerse/types";
import { useId } from "react";
import { formatDate } from "../formatDate.ts";
import { Card } from "./Card.tsx";
import { CardTitleButton } from "./CardTitleButton.tsx";
import { LanguagePair } from "./LanguagePair.tsx";

/** Lists projects in the given order, each as a card that opens the project when clicked. */
export function ProjectList({
  projects,
  onOpen,
}: {
  projects: readonly ProjectSummary[];
  onOpen: (projectId: string) => void;
}) {
  return (
    <ul aria-label="Projects" className="flex flex-col gap-3">
      {projects.map((project) => (
        <ProjectListItem key={project.id} project={project} onOpen={onOpen} />
      ))}
    </ul>
  );
}

function ProjectListItem({
  project,
  onOpen,
}: {
  project: ProjectSummary;
  onOpen: (projectId: string) => void;
}) {
  const detailsId = useId();
  return (
    <Card
      as="li"
      interactive
      className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
    >
      <CardTitleButton
        aria-describedby={detailsId}
        onClick={() => onOpen(project.id)}
      >
        {project.name}
      </CardTitleButton>
      <p
        id={detailsId}
        className="flex shrink-0 flex-wrap gap-x-4 text-sm text-fg-muted"
      >
        <LanguagePair
          targetLanguage={project.target_language}
          translationLanguage={project.translation_language}
        />
        <span>Opened {formatDate(project.last_opened_at)}</span>
      </p>
    </Card>
  );
}
