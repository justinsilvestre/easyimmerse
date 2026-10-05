import type { Project, ProjectSettings } from "@easyimmerse/types";
import { fieldsOfPreset } from "../flashcards/flashcardPresets.ts";

/** The settings a first project starts from. The translation language is the interface's, which is English for now. */
export const defaultProjectSettings: ProjectSettings = {
  name: "",
  target_language: "de",
  translation_language: "en",
  flashcard_fields: fieldsOfPreset("beginner"),
  default_tags: [],
  tags_media_name: true,
  fills_audio_with_tts: false,
};

/** The settings the new project form starts from: those of the last created project, without its name. */
export function newProjectSettings(
  projects: readonly Project[],
): ProjectSettings {
  const last = projects.reduce<Project | null>(
    (latest, project) =>
      latest === null || project.created_at_ms > latest.created_at_ms
        ? project
        : latest,
    null,
  );
  return last === null
    ? defaultProjectSettings
    : { ...last.settings, name: "" };
}
