import type {
  Flashcard,
  ListDictionariesResponse,
  ListFlashcardsResponse,
  ListMediaFilesResponse,
  ListProjectsResponse,
  Project,
  ProjectSettings,
  TimedTextTrack,
} from "@easyimmerse/types";

/** The cues of `fixtures/sample.srt`, as the backend returns them. */
export const fixtureTrack: TimedTextTrack = {
  format: "srt",
  cues: [
    { index: 1, start_ms: 500, end_ms: 1500, text: "The cat is sleeping." },
    {
      index: 2,
      start_ms: 1750,
      end_ms: 3000,
      text: "The dog wants to eat.\nIt is hungry.",
    },
    {
      index: 3,
      start_ms: 3250,
      end_ms: 4000,
      text: "<i>Everything</i> is quiet.",
    },
    { index: 4, start_ms: 4250, end_ms: 5000, text: "Good night." },
  ],
};

/** The settings of the intermediate preset, with no default tags. */
const intermediateSettings: Omit<
  ProjectSettings,
  "target_language" | "translation_language"
> = {
  flashcard_fields: [
    "word",
    "l1_definition",
    "text_context",
    "text_context_translation",
    "audio_context",
    "screenshot",
    "tags",
  ],
  default_tags: [],
  tags_media_name: true,
  fills_audio_with_tts: false,
};

/** Project `p1`, the most recently created and opened: German with English translations. */
export const fixtureProject: Project = {
  id: "p1",
  name: "Alpha",
  settings: {
    target_language: "de",
    translation_language: "en",
    ...intermediateSettings,
  },
  created_at_ms: 1767312000000,
  last_opened_at_ms: 1767398400000,
};

/** Project `p2`: Japanese with English translations. */
export const fixtureSecondProject: Project = {
  id: "p2",
  name: "Beta",
  settings: {
    target_language: "ja",
    translation_language: "en",
    ...intermediateSettings,
  },
  created_at_ms: 1767225600000,
  last_opened_at_ms: 1767225600000,
};

/** Both fixture projects, most recently opened first. */
export const fixtureProjects: ListProjectsResponse = {
  projects: [fixtureProject, fixtureSecondProject].map((project) => ({
    id: project.id,
    name: project.name,
    target_language: project.settings.target_language,
    translation_language: project.settings.translation_language,
    created_at_ms: project.created_at_ms,
    last_opened_at_ms: project.last_opened_at_ms,
    media_count: project.id === "p1" ? 2 : 0,
    flashcard_count: 0,
  })),
};

/** Two media files of project `p1`: one on the server's disk and one the browser holds. */
export const fixtureMediaFiles: ListMediaFilesResponse = {
  media_files: [
    {
      id: "m1",
      project_id: "p1",
      name: "episode.mkv",
      source: { kind: "path", path: "/videos/episode.mkv" },
      created_at_ms: 1767225600000,
      track_selection_json: null,
      subtitle_selection: { target: null, translation: null },
    },
    {
      id: "m2",
      project_id: "p1",
      name: "interview.mp3",
      source: {
        kind: "browser_file",
        size: 4820133,
        last_modified_ms: 1767225600000,
      },
      created_at_ms: 1767312000000,
      track_selection_json: null,
      subtitle_selection: { target: null, translation: null },
    },
  ],
};

/** A flashcard of project `p1`, made from `m1`. The project's fixture flashcard list leaves it out. */
export const fixtureFlashcard: Flashcard = {
  id: "f1",
  project_id: "p1",
  media_file_id: "m1",
  fields: {
    word: "Katze",
    word_pronunciation: "",
    l1_definition: "cat",
    l2_definition: "",
    text_context: "Die Katze schläft.",
    text_context_translation: "The cat is sleeping.",
    text_context_pronunciation: "",
    audio_context: { start_ms: 500, end_ms: 1500 },
    screenshot_at_ms: null,
    tags: [],
  },
  included_fields: intermediateSettings.flashcard_fields,
  has_screenshot_image: false,
  created_at_ms: 1767312000000,
  updated_at_ms: 1767312000000,
};

export const fixtureFlashcards: ListFlashcardsResponse = { flashcards: [] };

/**
 * Two enabled German dictionaries, one with English definitions and one with German ones,
 * and a disabled Japanese one.
 */
export const fixtureDictionaries: ListDictionariesResponse = {
  dictionaries: [
    {
      id: "d1",
      title: "German-English",
      entry_count: 3,
      format: "yomitan",
      source_language: "de",
      target_language: "en",
      is_enabled: true,
    },
    {
      id: "d2",
      title: "German",
      entry_count: 2,
      format: "yomitan",
      source_language: "de",
      target_language: "de",
      is_enabled: true,
    },
    {
      id: "d3",
      title: "JMdict",
      entry_count: 5,
      format: "yomitan",
      source_language: "ja",
      target_language: "en",
      is_enabled: false,
    },
  ],
};

export const fixtureResponses = {
  "GET /projects": fixtureProjects,
  "GET /projects/p1": fixtureProject,
  "GET /projects/p2": fixtureSecondProject,
  "POST /projects/p1/opened": undefined,
  "POST /projects/p2/opened": undefined,
  "GET /projects/p1/flashcards": fixtureFlashcards,
  "GET /projects/p1/media": fixtureMediaFiles,
  "GET /dictionaries": fixtureDictionaries,
  "POST /timed-text/parse": fixtureTrack,
};
