import type { ProjectSummary } from "@easyimmerse/types";
import { Button } from "./Button.tsx";

export function ProjectList({
  projects,
  onOpen,
}: {
  projects: readonly ProjectSummary[];
  onOpen: (projectId: string) => void;
}) {
  return (
    <ul aria-label="Projects" className="flex flex-col gap-2">
      {projects.map((project) => (
        <li key={project.id}>
          <Button variant="primary" onClick={() => onOpen(project.id)}>
            {project.name}
          </Button>
          <span className="ml-2 text-sm text-gray-500">{project.language}</span>
        </li>
      ))}
    </ul>
  );
}
