import type { BackendRequest } from "@easyimmerse/backend";
import { actions } from "@easyimmerse/state";
import type {
  BatchLookupRequest,
  BatchLookupResponse,
  Cue,
  DictionarySummary,
  Flashcard,
  FlashcardDraft,
  LookupResponse,
  NewFlashcard,
} from "@easyimmerse/types";
import { act, fireEvent, screen } from "@testing-library/react";
import { vi } from "vitest";
import { exampleFlashcard } from "../flashcards/exampleFlashcard.ts";
import { exampleResults } from "../lookup/exampleLookup.ts";
import { NavigationActionsContext } from "../navigationContext.ts";
import { MediaScreen } from "../screens/MediaScreen.tsx";
import {
  createFakeBackendClient,
  type FakeResponse,
} from "./createFakeBackendClient.ts";
import {
  fixtureProject,
  fixtureResponses,
  fixtureTrack,
} from "./fixtureResponses.ts";
import { directPlaybackRoutes, fakeServer } from "./mediaFixtureResponses.ts";
import { renderWithAppStore } from "./renderWithAppStore.tsx";

export const savedFlashcard: Flashcard = {
  id: "f1",
  project_id: "p1",
  media_file_id: "m1",
  cue_index: null,
  word_start: null,
  content: { ...exampleFlashcard, screenshot: { at_ms: 2400 } },
  included_fields: ["word", "audio_context", "screenshot"],
  created_at_ms: 0,
  updated_at_ms: 0,
};

export function dictionarySummary(
  id: string,
  sourceLanguage: string,
  targetLanguage: string,
): DictionarySummary {
  return {
    id,
    title: id,
    format: "csv",
    source_language: sourceLanguage,
    target_language: targetLanguage,
    entry_count: 1,
    term_meta_count: 0,
    tag_count: 0,
    kanji_count: 0,
    kanji_meta_count: 0,
    media_count: 0,
  };
}

const germanDictionaries = [
  dictionarySummary("wiktionary-de-en", "de", "en"),
  dictionarySummary("dwds", "de", "de"),
];

const lookupResponse: LookupResponse = {
  results: [...exampleResults],
  kanji: [],
  stylesheets: [],
};

type MediaScreenSetup = {
  flashcards?: Flashcard[];
  /** The cues of the media file's subtitles, in place of the fixture track's. */
  cues?: Cue[];
  dictionaries?: DictionarySummary[];
  /** The texts whose lookups never answer. Every other lookup finds the example results. */
  unansweredLookups?: readonly string[];
  /** The texts whose lookups answer only after the given number of milliseconds. */
  slowLookups?: Readonly<Record<string, number>>;
  /** The texts whose lookups fail after the given number of milliseconds. */
  failingLookups?: Readonly<Record<string, number>>;
  /**
   * How many milliseconds batch lookups take to find the example results at every position of every text,
   * or null, the default, for a server that offers no batch lookups.
   */
  batchLookupMs?: number | null;
  /** Canned responses that add to or replace the screen's usual ones. */
  responses?: Record<string, FakeResponse>;
};

/**
 * Renders the media screen on the sample video and subtitles of the fixture project, with the given flashcards and dictionaries.
 * Opening the dictionaries settings is counted in `navigation`.
 */
export function renderMediaScreen({
  flashcards = [],
  cues = fixtureTrack.cues,
  dictionaries = germanDictionaries,
  unansweredLookups = [],
  slowLookups = {},
  failingLookups = {},
  batchLookupMs = null,
  responses = {},
}: MediaScreenSetup = {}) {
  const client = withLookupTiming(
    createFakeBackendClient(
      {
        ...fixtureResponses,
        "GET /dictionaries": { dictionaries },
        "GET /dictionaries/lookup": lookupResponse,
        "GET /projects/p1/flashcards": { flashcards },
        "GET /projects/p1/media/m1/subtitles/s1/cues": { format: "srt", cues },
        "PUT /projects/p1/flashcards/f1": savedFlashcard,
        "POST /projects/p1/media/m1/subtitles":
          fixtureResponses["GET /projects/p1/media/m1/subtitles"].tracks[0],
        "POST /projects/p1/flashcards": savedFlashcard,
        ...responses,
      },
      directPlaybackRoutes,
    ),
    { unansweredLookups, slowLookups, failingLookups, batchLookupMs },
  );
  const navigation = { dictionariesOpenCount: 0 };
  const rendered = renderWithAppStore(
    <NavigationActionsContext
      value={{
        openSettings: () => undefined,
        openDictionaries: () => {
          navigation.dictionariesOpenCount += 1;
        },
        openMediaFile: () => undefined,
      }}
    >
      <MediaScreen project={fixtureProject} mediaFileId="m1" />
    </NavigationActionsContext>,
    client,
    { server: fakeServer },
  );
  act(() => {
    rendered.store.dispatch(actions.preferencesLoaded({}));
    rendered.store.dispatch(actions.openMedia("m1"));
  });
  return { ...rendered, client, navigation };
}

/** Wraps a client so that lookups of the given texts never answer, answer late, or fail late. */
function withLookupTiming(
  client: ReturnType<typeof createFakeBackendClient>,
  {
    unansweredLookups,
    slowLookups,
    failingLookups,
    batchLookupMs,
  }: Required<
    Pick<
      MediaScreenSetup,
      "unansweredLookups" | "slowLookups" | "failingLookups" | "batchLookupMs"
    >
  >,
): ReturnType<typeof createFakeBackendClient> {
  return {
    requests: client.requests,
    send: <T,>(request: BackendRequest) => {
      if (
        request.path === "/dictionaries/lookup/batch" &&
        batchLookupMs !== null
      ) {
        client.requests.push(request);
        const answer = answerBatch(bodyOf(request) as BatchLookupRequest);
        return after(batchLookupMs).then(() => ({ data: answer as T }));
      }
      const text =
        request.path === "/dictionaries/lookup" ? request.query?.text : null;
      if (text == null) return client.send<T>(request);
      if (unansweredLookups.includes(text)) {
        client.requests.push(request);
        return new Promise(() => undefined);
      }
      const failMs = failingLookups[text];
      if (failMs !== undefined) {
        client.requests.push(request);
        return after(failMs).then(() => ({
          error: { status: 500, message: "The dictionaries are unavailable" },
        }));
      }
      const delayMs = slowLookups[text];
      if (delayMs === undefined) return client.send<T>(request);
      return after(delayMs).then(() => client.send<T>(request));
    },
  };
}

/** Finds every one of the example results at each position of each text. */
function answerBatch({ texts }: BatchLookupRequest): BatchLookupResponse {
  const resultIndexes = exampleResults.map((_, index) => index);
  return {
    texts: texts.map((text) => ({
      positions: [...text].map((_, offset) => ({
        offset,
        results: resultIndexes,
        kanji: [],
      })),
    })),
    results: [...exampleResults],
    kanji: [],
    stylesheets: [],
  };
}

const after = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function findSubtitles() {
  await screen.findByRole("button", { name: "night" });
  return screen.getByRole("list", { name: "Subtitles" });
}

export function requestsTo(
  requests: BackendRequest[],
  method: string,
  path: string,
) {
  return requests.filter(
    (request) => request.method === method && request.path === path,
  );
}

export function bodyOf(request: BackendRequest | undefined): unknown {
  return request?.body?.kind === "json" ? request.body.value : undefined;
}

/** The draft a request that creates a flashcard sent. */
export function createdDraftOf(
  request: BackendRequest | undefined,
): FlashcardDraft | undefined {
  return (bodyOf(request) as NewFlashcard | undefined)?.draft;
}

/** Starts a flashcard for a word with the E key while the mouse is on it, and waits for the editor, which opens once the word's lookup answers. */
export async function openFlashcardFor(element: HTMLElement) {
  fireEvent.pointerEnter(element, { pointerType: "mouse" });
  fireEvent.keyDown(document.body, { key: "e" });
  await screen.findByRole("form", { name: "Flashcard" });
}

/** The draft of the first flashcard the screen created, once its request has been sent. */
export async function findCreatedDraft(
  client: ReturnType<typeof createFakeBackendClient>,
) {
  return vi.waitFor(() => {
    const draft = createdDraftOf(
      requestsTo(client.requests, "POST", "/projects/p1/flashcards")[0],
    );
    if (!draft) throw new Error("No flashcard has been created yet.");
    return draft;
  });
}

/** The play and pause requests made so far, in order. */
export const playbackCalls = (effects: { calls: { type: string }[] }) =>
  effects.calls
    .map((call) => call.type)
    .filter((type) => type === "playPlayer" || type === "pausePlayer");
