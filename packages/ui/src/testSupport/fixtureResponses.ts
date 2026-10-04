import type {
  ListFlashcardsResponse,
  ListMediaFilesResponse,
  ListProjectsResponse,
  Project,
  ProjectSettings,
  SubtitleTracksResponse,
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

function fixtureSettings(
  name: string,
  targetLanguage: string,
): ProjectSettings {
  return {
    name,
    target_language: targetLanguage,
    translation_language: "en",
    flashcard_fields: ["word", "l1_definition", "text_context", "tags"],
    default_tags: [],
    tags_media_name: true,
    fills_audio_with_tts: false,
  };
}

/** A German project opened on 2026-01-03 and created on 2026-01-01. */
export const fixtureProject: Project = {
  id: "p1",
  settings: fixtureSettings("Alpha", "de"),
  created_at_ms: 1767225600000,
  last_opened_at_ms: 1767398400000,
  media_count: 2,
  flashcard_count: 0,
};

export const fixtureProjects: ListProjectsResponse = {
  projects: [
    fixtureProject,
    {
      id: "p2",
      settings: fixtureSettings("Beta", "ja"),
      created_at_ms: 1767312000000,
      last_opened_at_ms: 1767312000000,
      media_count: 0,
      flashcard_count: 0,
    },
  ],
};

export const noFlashcards: ListFlashcardsResponse = { flashcards: [] };

/** One subtitles track on a media file, shown as the target-language subtitles. */
export const fixtureSubtitleTracks: SubtitleTracksResponse = {
  tracks: [
    {
      id: "s1",
      media_file_id: "m1",
      name: "sample.srt",
      format: "srt",
      sample: "The cat is sleeping.",
      created_at_ms: 1767225600000,
    },
  ],
  selection: { target_track_id: "s1", translation_track_id: null },
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
    },
  ],
};

export const fixtureResponses = {
  "GET /projects": fixtureProjects,
  "GET /projects/p1": fixtureProject,
  "POST /projects/p1/opened": undefined,
  "GET /projects/p1/media": fixtureMediaFiles,
  "GET /projects/p1/flashcards": noFlashcards,
  "GET /projects/p1/media/m1/subtitles": fixtureSubtitleTracks,
  "GET /projects/p1/media/m1/subtitles/s1/cues": fixtureTrack,
  "GET /projects/p1/media/m2/subtitles": {
    tracks: [],
    selection: { target_track_id: null, translation_track_id: null },
  } satisfies SubtitleTracksResponse,
  "POST /timed-text/parse": fixtureTrack,
};
