import type { Project, ProjectSettings } from "@easyimmerse/types";
import { fieldsOfPreset } from "../flashcards/flashcardPresets.ts";
import { dayMs } from "./formatRelativeDate.ts";

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
  };
}

/** Projects for stories, ordered as the home screen lists them. */
export const exampleProjects: readonly Project[] = [
  {
    id: "project-german",
    settings: settings("German", "de"),
    created_at_ms: daysAgo(40),
    last_opened_at_ms: daysAgo(0),
    media_count: 10,
    flashcard_count: 184,
  },
  {
    id: "project-japanese",
    settings: settings("Japanese", "ja"),
    created_at_ms: daysAgo(12),
    last_opened_at_ms: daysAgo(1),
    media_count: 3,
    flashcard_count: 42,
  },
  {
    id: "project-spanish",
    settings: settings("Intermediate Spanish", "es"),
    created_at_ms: daysAgo(90),
    last_opened_at_ms: daysAgo(45),
    media_count: 1,
    flashcard_count: 7,
  },
];
