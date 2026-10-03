import type {
  ListMediaFilesResponse,
  ListProjectsResponse,
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

export const fixtureProjects: ListProjectsResponse = {
  projects: [
    {
      id: "p1",
      name: "Alpha",
      language: "de",
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "p2",
      name: "Beta",
      language: "ja",
      created_at: "2026-01-02T00:00:00Z",
    },
  ],
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
  "GET /projects/p1/media": fixtureMediaFiles,
  "POST /timed-text/parse": fixtureTrack,
};
