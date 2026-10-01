import type { ListProjectsResponse, TimedTextTrack } from "@easyimmerse/types";

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
      target_language: "de",
      translation_language: "en",
      created_at: "2026-01-01T00:00:00Z",
      last_opened_at: "2026-01-03T00:00:00Z",
    },
    {
      id: "p2",
      name: "Beta",
      target_language: "ja",
      translation_language: "en",
      created_at: "2026-01-02T00:00:00Z",
      last_opened_at: "2026-01-02T00:00:00Z",
    },
  ],
};

export const fixtureResponses = {
  "GET /projects": fixtureProjects,
  "POST /timed-text/parse": fixtureTrack,
};
