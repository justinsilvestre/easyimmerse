import type { Project } from "@easyimmerse/types";

/** A German project holding a video with two subtitle tracks, an audiobook, and an ebook. */
export const fixtureProject: Project = {
  id: "project-1",
  settings: {
    name: "Dark, season one",
    target_language: "de",
    translation_language: "en",
    flashcard_settings: {
      included_fields: ["word", "l1_definition", "context", "context_audio"],
      default_tags: [],
      tag_with_media_name: true,
      use_tts_when_no_audio: true,
    },
  },
  media: [
    {
      id: "media-1",
      name: "Dark S01E01 – Geheimnisse.mkv",
      kind: "video",
      source: { kind: "path", path: "/Videos/Dark/Dark S01E01.mkv" },
      duration_ms: 3_161_000,
      subtitle_tracks: [
        {
          id: "track-1",
          name: "Deutsch",
          role: "target",
          language: "de",
          source: { kind: "embedded", track_id: 3 },
        },
        {
          id: "track-2",
          name: "Dark S01E01.en.srt",
          role: "translation",
          language: "en",
          source: {
            kind: "file",
            source: { kind: "path", path: "/Videos/Dark/Dark S01E01.en.srt" },
          },
        },
      ],
      added_at: "2026-09-01T09:05:00Z",
    },
    {
      id: "media-2",
      name: "Die Verwandlung – Hörbuch.mp3",
      kind: "audio",
      source: { kind: "path", path: "/Audio/Die Verwandlung.mp3" },
      duration_ms: 7_930_000,
      subtitle_tracks: [],
      added_at: "2026-09-03T18:20:00Z",
    },
    {
      id: "media-3",
      name: "Die Verwandlung.epub",
      kind: "document",
      source: { kind: "path", path: "/Books/Die Verwandlung.epub" },
      duration_ms: null,
      subtitle_tracks: [],
      added_at: "2026-09-03T18:22:00Z",
    },
  ],
  created_at: "2026-09-01T09:00:00Z",
  last_opened_at: "2026-09-28T19:30:00Z",
};
