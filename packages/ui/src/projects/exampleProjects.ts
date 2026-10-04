import type { ProjectSummary } from "@easyimmerse/types";
import { dayMs } from "./formatRelativeDate.ts";

function daysAgo(days: number): number {
  return Date.now() - days * dayMs;
}

/** Projects for stories, ordered as the home screen lists them. */
export const exampleProjects: readonly ProjectSummary[] = [
  {
    id: "project-german",
    name: "German",
    target_language: "de",
    translation_language: "en",
    created_at_ms: daysAgo(40),
    last_opened_at_ms: daysAgo(0),
    media_count: 10,
    flashcard_count: 184,
  },
  {
    id: "project-japanese",
    name: "Japanese",
    target_language: "ja",
    translation_language: "en",
    created_at_ms: daysAgo(12),
    last_opened_at_ms: daysAgo(1),
    media_count: 3,
    flashcard_count: 42,
  },
  {
    id: "project-spanish",
    name: "Intermediate Spanish",
    target_language: "es",
    translation_language: "en",
    created_at_ms: daysAgo(90),
    last_opened_at_ms: daysAgo(45),
    media_count: 1,
    flashcard_count: 7,
  },
];
