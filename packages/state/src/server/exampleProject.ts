import type { Project, ProjectSettings } from "@easyimmerse/types";

/** The settings of a Korean project with English translations, for tests. */
export const exampleProjectSettings: ProjectSettings = {
  name: "Korean",
  target_language: "ko",
  translation_language: "en",
  flashcard_fields: ["word"],
  default_tags: [],
  tags_media_name: false,
  fills_audio_with_tts: false,
};

/** Returns a project with the given id and `exampleProjectSettings`, for tests. */
export function exampleProject(id: string): Project {
  return {
    id,
    settings: exampleProjectSettings,
    created_at_ms: 0,
    last_opened_at_ms: 0,
    media_count: 0,
    flashcard_count: 0,
  };
}
