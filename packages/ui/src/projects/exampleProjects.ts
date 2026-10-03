import type { ProjectCardData } from "./ProjectCard.tsx";

const dayMs = 24 * 60 * 60 * 1000;

function daysAgo(days: number): string {
  return new Date(Date.now() - days * dayMs).toISOString();
}

/** Projects for stories, ordered as the home screen lists them. */
export const exampleProjects: readonly ProjectCardData[] = [
  {
    id: "project-dark",
    name: "Dark, season one",
    language: "de",
    created_at: daysAgo(40),
    last_opened_at: daysAgo(0),
    media_count: 10,
    flashcard_count: 184,
  },
  {
    id: "project-diner",
    name: "Midnight Diner",
    language: "ja",
    created_at: daysAgo(12),
    last_opened_at: daysAgo(1),
    media_count: 3,
    flashcard_count: 42,
  },
  {
    id: "project-verwandlung",
    name: "Die Verwandlung",
    language: "de",
    created_at: daysAgo(90),
    last_opened_at: daysAgo(45),
    media_count: 1,
    flashcard_count: 7,
  },
];
