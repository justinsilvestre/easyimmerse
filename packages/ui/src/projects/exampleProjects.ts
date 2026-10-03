import { dayMs } from "./formatRelativeDate.ts";
import type { ProjectCardData } from "./ProjectCard.tsx";

function daysAgo(days: number): string {
  return new Date(Date.now() - days * dayMs).toISOString();
}

/** Projects for stories, ordered as the home screen lists them. */
export const exampleProjects: readonly ProjectCardData[] = [
  {
    id: "project-german",
    name: "German",
    language: "de",
    created_at: daysAgo(40),
    last_opened_at: daysAgo(0),
    media_count: 10,
    flashcard_count: 184,
  },
  {
    id: "project-japanese",
    name: "Japanese",
    language: "ja",
    created_at: daysAgo(12),
    last_opened_at: daysAgo(1),
    media_count: 3,
    flashcard_count: 42,
  },
  {
    id: "project-spanish",
    name: "Intermediate Spanish",
    language: "es",
    created_at: daysAgo(90),
    last_opened_at: daysAgo(45),
    media_count: 1,
    flashcard_count: 7,
  },
];
