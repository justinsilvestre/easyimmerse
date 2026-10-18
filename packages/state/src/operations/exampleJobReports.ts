import type { ImportJobStatus, MediaSourceJob } from "@easyimmerse/types";

/** A dictionary import that has stored a few entries and is still running. */
export const runningImportStatus: ImportJobStatus = {
  state: "running",
  progress: {
    entries: 12,
    term_meta: 0,
    kanji: 0,
    kanji_meta: 0,
    tags: 0,
    media: 0,
  },
  dictionary: null,
  error: null,
};

/** A fetch through a media-source plugin that is still running. */
export const runningMediaSourceJob: MediaSourceJob = {
  id: "j1",
  project_id: "p1",
  plugin: "video-site",
  locator: "https://videos.example.com/abc",
  status: "running",
  progress: { fraction: 0.5, message: "downloading" },
  log: [],
  media_file: null,
  skipped_subtitles: [],
  error: null,
  started_at_ms: 0,
  finished_at_ms: null,
};
