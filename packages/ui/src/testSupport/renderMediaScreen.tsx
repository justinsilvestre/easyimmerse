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
import { Profiler } from "react";
import { vi } from "vitest";
import { exampleFlashcard } from "../flashcards/exampleFlashcard.ts";
import { exampleResults } from "../lookup/exampleLookup.ts";
import { MediaScreen } from "../screens/MediaScreen.tsx";
import {
  createFakeBackendClient,
  type FakeResponse,
  type FakeRoute,
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
  /** The texts whose lookups wait until the test answers or fails them. Every other lookup finds the example results at once. */
  heldLookups?: readonly string[];
  /**
   * How the server answers batch lookups, which find the example results at every position of every text:
   * not at all, as a server without them, the default; at once; or once the test releases them.
   */
  batchLookups?: "unavailable" | "immediate" | "held";
  /** Canned responses that add to or replace the screen's usual ones. */
  responses?: Record<string, FakeResponse>;
  /** The routes that answer the file's tracks and plan; by default, those of a file that plays directly. */
  playbackRoutes?: readonly FakeRoute[];
  /** Called after each commit of the screen, through React's `Profiler`. */
  onCommit?: () => void;
};

/**
 * Renders the media screen on the sample video and subtitles of the fixture project, with the given flashcards and dictionaries.
 */
export function renderMediaScreen({
  flashcards = [],
  cues = fixtureTrack.cues,
  dictionaries = germanDictionaries,
  heldLookups = [],
  batchLookups = "unavailable",
  responses = {},
  playbackRoutes = directPlaybackRoutes,
  onCommit,
}: MediaScreenSetup = {}) {
  const client = withHeldLookups(
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
      playbackRoutes,
    ),
    heldLookups,
    batchLookups,
  );
  const rendered = renderWithAppStore(
    <Profiler id="MediaScreen" onRender={() => onCommit?.()}>
      <MediaScreen project={fixtureProject} mediaFileId="m1" />
    </Profiler>,
    client,
    { server: fakeServer },
  );
  act(() => {
    rendered.store.dispatch(actions.preferencesLoaded({}));
    rendered.store.dispatch(
      actions.openMediaFileRequested(fixtureProject.id, "m1"),
    );
  });
  /** Moves the store's clock on, firing the timers that fall due, such as the pop-up's close and a flashcard's wait for its lookup. */
  const advanceClock = (ms: number) =>
    act(() => rendered.effects.clock.advanceBy(ms));
  return { ...rendered, client, advanceClock };
}

type Release = () => void;

/**
 * Wraps a client so that lookups of the given texts, and batch lookups when held, wait until the test lets them go:
 * `answerLookup` and `failLookup` for a text, and `releaseBatches` for every batch so far.
 */
function withHeldLookups(
  client: ReturnType<typeof createFakeBackendClient>,
  heldLookups: readonly string[],
  batchLookups: NonNullable<MediaScreenSetup["batchLookups"]>,
) {
  const held = new Map<string, Release[]>();
  const failed = new Set<string>();
  const heldBatches: Release[] = [];
  const hold = (into: Release[]) =>
    new Promise<void>((resolve) => into.push(resolve));
  const releaseText = (text: string) => {
    for (const release of held.get(text)?.splice(0) ?? []) release();
  };
  const send = async <T,>(request: BackendRequest) => {
    if (
      request.path === "/dictionaries/lookup/batch" &&
      batchLookups !== "unavailable"
    ) {
      client.requests.push(request);
      if (batchLookups === "held") await hold(heldBatches);
      return { data: answerBatch(bodyOf(request) as BatchLookupRequest) as T };
    }
    const text =
      request.path === "/dictionaries/lookup" ? request.query?.text : null;
    if (text == null || !heldLookups.includes(text))
      return client.send<T>(request);
    client.requests.push(request);
    if (!held.has(text)) held.set(text, []);
    await hold(held.get(text) as Release[]);
    return failed.has(text)
      ? { error: { status: 500, message: "The dictionaries are unavailable" } }
      : client.send<T>(request);
  };
  return {
    requests: client.requests,
    send,
    /** Lets the held lookups of the text answer, with the example results. */
    answerLookup: (text: string) => act(async () => releaseText(text)),
    /** Lets the held lookups of the text fail. */
    failLookup: (text: string) => {
      failed.add(text);
      return act(async () => releaseText(text));
    },
    /** Lets every batch lookup held so far answer. */
    releaseBatches: () =>
      act(async () => {
        for (const release of heldBatches.splice(0)) release();
      }),
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
/** Waits until the client has sent a request, for when its answer cannot be seen on the page. */
export async function findRequestTo(
  client: { requests: BackendRequest[] },
  method: string,
  path: string,
) {
  return vi.waitFor(() => {
    const [request] = requestsTo(client.requests, method, path);
    if (!request) throw new Error(`No request to ${method} ${path} yet.`);
    return request;
  });
}

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
