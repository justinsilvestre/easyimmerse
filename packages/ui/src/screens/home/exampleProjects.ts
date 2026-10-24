import type {
  Project,
  ProjectSettings,
  ReviewCounts,
} from "@easyimmerse/types";
import { dayMs } from "../../lib/formatting/formatRelativeDate.ts";
import {
  fieldsOfPreset,
  frontFieldsOfPreset,
} from "../projectSettings/flashcardPresets.ts";

function daysAgo(days: number): number {
  return Date.now() - days * dayMs;
}

function settings(name: string, targetLanguage: string): ProjectSettings {
  return {
    name,
    target_language: targetLanguage,
    translation_language: "en",
    flashcard_fields: fieldsOfPreset("intermediate"),
    default_tags: [],
    tags_media_name: true,
    fills_audio_with_tts: false,
    flashcard_front_fields: frontFieldsOfPreset("intermediate"),
    lists_anki_deletions: true,
  };
}

/** A project with cards due for review, for stories. */
export const exampleProjectWithReviewsDue = {
  id: "project-german",
  settings: settings("German", "de"),
  created_at_ms: daysAgo(40),
  last_opened_at_ms: daysAgo(0),
  media_count: 10,
  uses_anki_connect: false,
  is_backed_up: false,
  flashcard_count: 184,
  unreviewed_count: 20,
} satisfies Project;

/** A project with nothing due but with cards never reviewed, for stories. */
export const exampleProjectWithNewCards = {
  id: "project-japanese",
  settings: settings("Japanese", "ja"),
  created_at_ms: daysAgo(12),
  last_opened_at_ms: daysAgo(1),
  media_count: 3,
  uses_anki_connect: false,
  is_backed_up: false,
  flashcard_count: 42,
  unreviewed_count: 12,
} satisfies Project;

/** A project with nothing to review or learn, for stories. */
export const exampleProjectReviewed = {
  id: "project-spanish",
  settings: settings("Intermediate Spanish", "es"),
  created_at_ms: daysAgo(90),
  last_opened_at_ms: daysAgo(45),
  media_count: 1,
  uses_anki_connect: false,
  is_backed_up: false,
  flashcard_count: 7,
  unreviewed_count: 0,
} satisfies Project;

/** What waits in the review of each example project, for stories. */
export const exampleReviewCounts: readonly ReviewCounts[] = [
  {
    project_id: "project-german",
    due_count: 6,
    learning_count: 2,
    new_count: 20,
  },
  {
    project_id: "project-japanese",
    due_count: 0,
    learning_count: 0,
    new_count: 12,
  },
  {
    project_id: "project-spanish",
    due_count: 0,
    learning_count: 0,
    new_count: 0,
  },
];

/** Projects for stories, ordered as the home screen lists them. */
export const exampleProjects: readonly Project[] = [
  exampleProjectWithReviewsDue,
  exampleProjectWithNewCards,
  exampleProjectReviewed,
];
