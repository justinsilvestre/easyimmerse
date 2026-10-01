import type { BackendRequest } from "@easyimmerse/backend";
import type {
  FlashcardDraftRequest,
  ListProjectsResponse,
  NewFlashcard,
  TimedTextTrack,
} from "@easyimmerse/types";
import { fixtureTranslationCues } from "../storybook/fixtureTranslationCues.ts";
import type { FakeResponse } from "./createFakeBackendClient.ts";
import { fixtureDocument } from "./fixtureDocument.ts";
import {
  fixtureBilingualDictionary,
  fixtureLookupResults,
  fixtureMonolingualDictionary,
} from "./fixtureLookup.ts";
import { fixtureProject } from "./fixtureProject.ts";

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

const fixtureMediaPath = "/projects/project-1/media/media-1";

/** Canned responses for the fixture projects, the fixture project's video, and the fixture dictionaries. */
export const fixtureResponses: Record<string, FakeResponse> = {
  "GET /projects": fixtureProjects,
  "POST /timed-text/parse": fixtureTrack,
  "GET /projects/project-1": fixtureProject,
  "GET /projects/project-1/flashcards": { flashcards: [] },
  [`GET ${fixtureMediaPath}/subtitle-tracks/track-1/cues`]: fixtureTrack,
  [`GET ${fixtureMediaPath}/subtitle-tracks/track-2/cues`]: {
    format: "srt",
    cues: fixtureTranslationCues,
  },
  "POST /documents/parse-local": fixtureDocument,
  "GET /dictionaries": {
    dictionaries: [fixtureBilingualDictionary, fixtureMonolingualDictionary],
  },
  "GET /dictionaries/lookup": { results: fixtureLookupResults },
  "POST /flashcards/draft": draftFixtureFlashcard,
};

/** Drafts a card holding the word or its lemma and the L1 definitions, as a simplified stand-in for the server. */
function draftFixtureFlashcard(request: BackendRequest): NewFlashcard {
  const draft = (request.body?.value ?? {}) as FlashcardDraftRequest;
  return {
    media_id: draft.media_id,
    fields: [
      { kind: "word", value: draft.lemma ?? draft.word },
      { kind: "l1_definition", value: draft.l1_definitions.join("; ") },
    ],
    tags: [],
    clip: draft.clip,
    screenshot_ms: draft.screenshot_ms,
  };
}
