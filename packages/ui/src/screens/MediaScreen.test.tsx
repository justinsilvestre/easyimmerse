import type { BackendRequest } from "@easyimmerse/backend";
import { resetBackend } from "@easyimmerse/backend";
import {
  actions,
  createBrowserFileRegistry,
  selectCurrentMediaFileId,
} from "@easyimmerse/state";
import type {
  DictionarySummary,
  Flashcard,
  LookupResponse,
  MediaFile,
} from "@easyimmerse/types";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { exampleFlashcard } from "../flashcards/exampleFlashcard.ts";
import { exampleResults } from "../lookup/exampleLookup.ts";
import { NavigationActionsContext } from "../navigationContext.ts";
import {
  createFrameCapturer,
  type FrameCapturer,
} from "../player/browserFrameCapturer.ts";
import type { FrameSource } from "../player/captureVideoFrame.ts";
import { FrameCapturerContext } from "../player/frameCapturerContext.ts";
import { createFakeBackendClient } from "../testSupport/createFakeBackendClient.ts";
import { createFakeFrameCapturer } from "../testSupport/createFakeFrameCapturer.ts";
import {
  fixtureProject,
  fixtureResponses,
  fixtureSubtitleTracks,
  fixtureTrack,
} from "../testSupport/fixtureResponses.ts";
import {
  directPlaybackRoutes,
  fakeServer,
} from "../testSupport/mediaFixtureResponses.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { MediaScreen } from "./MediaScreen.tsx";

/** Fires what a browser fires for a double-click: two clicks counting up, then dblclick. */
function doubleClick(element: HTMLElement) {
  fireEvent.click(element, { detail: 1 });
  fireEvent.click(element, { detail: 2 });
  fireEvent.doubleClick(element, { detail: 2 });
}

/** Double-clicks a word and waits for the flashcard editor, which opens once the word's lookup answers. */
async function doubleClickWord(element: HTMLElement) {
  doubleClick(element);
  await screen.findByRole("form", { name: "Flashcard" });
}

afterEach(() => {
  cleanup();
  resetBackend();
  vi.restoreAllMocks();
});

const savedFlashcard: Flashcard = {
  id: "f1",
  project_id: "p1",
  media_file_id: "m1",
  cue_index: null,
  content: { ...exampleFlashcard, screenshot: { at_ms: 2400 } },
  included_fields: ["word", "audio_context", "screenshot"],
  created_at_ms: 0,
  updated_at_ms: 0,
};

function dictionarySummary(
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

function renderMediaScreen(
  flashcards: Flashcard[] = [],
  dictionaries: DictionarySummary[] = germanDictionaries,
) {
  const client = createFakeBackendClient(
    {
      ...fixtureResponses,
      "GET /dictionaries": { dictionaries },
      "GET /dictionaries/lookup": lookupResponse,
      "GET /projects/p1/flashcards": { flashcards },
      "PUT /projects/p1/flashcards/f1": savedFlashcard,
      "POST /projects/p1/media/m1/subtitles":
        fixtureResponses["GET /projects/p1/media/m1/subtitles"].tracks[0],
      "POST /projects/p1/flashcards": savedFlashcard,
    },
    directPlaybackRoutes,
  );
  const navigation = { dictionariesOpenCount: 0 };
  const rendered = renderWithAppStore(
    <NavigationActionsContext
      value={{
        openSettings: () => undefined,
        openDictionaries: () => {
          navigation.dictionariesOpenCount += 1;
        },
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

/**
 * Renders the screen on a video the browser added, with the sample subtitles.
 * The browser's registry holds the given file, or nothing when it is null, and frames are captured with the given capturer.
 */
function renderBrowserVideoScreen(
  file: File | null,
  capturer: FrameCapturer = createFakeFrameCapturer(true),
) {
  const registry = createBrowserFileRegistry<File>();
  const mediaFile: MediaFile = {
    id: "m3",
    project_id: "p1",
    name: "clip.mp4",
    source:
      file === null
        ? { kind: "browser_file", size: 1, last_modified_ms: 1 }
        : registry.register(file),
    created_at_ms: 1,
    track_selection_json: null,
  };
  const client = createFakeBackendClient({
    ...fixtureResponses,
    "GET /projects/p1/media": { media_files: [mediaFile] },
    "GET /projects/p1/media/m3/subtitles": fixtureSubtitleTracks,
    "GET /projects/p1/media/m3/subtitles/s1/cues": fixtureTrack,
    "POST /projects/p1/flashcards": savedFlashcard,
  });
  const rendered = renderWithAppStore(
    <FrameCapturerContext value={capturer}>
      <MediaScreen project={fixtureProject} mediaFileId="m3" />
    </FrameCapturerContext>,
    client,
    { server: fakeServer, browserFileRegistry: registry },
  );
  act(() => {
    rendered.store.dispatch(actions.preferencesLoaded({}));
    rendered.store.dispatch(actions.openMedia("m3"));
  });
  return { ...rendered, client };
}

/** A capturer whose probes wait until the test answers whether the file shows pictures. */
function createWaitingFrameCapturer() {
  let answer: (hasPictures: boolean) => void = () => undefined;
  const answered = new Promise<boolean>((resolve) => {
    answer = resolve;
  });
  const capturer = createFrameCapturer({
    openVideo: async () =>
      (await answered)
        ? { element: {} as FrameSource, close: () => undefined }
        : null,
    captureFrame: async (_video, seconds) => `frame-at-${seconds}`,
  });
  return { capturer, answer };
}

/** Starts a new flashcard from a word in the subtitles before the probe answers, then lets it answer. */
async function startFlashcardBeforeProbe(hasPictures: boolean) {
  const file = browserVideo();
  const { capturer, answer } = createWaitingFrameCapturer();
  const rendered = renderBrowserVideoScreen(file, capturer);
  const list = await findSubtitles();
  await doubleClickWord(within(list).getByRole("button", { name: "cat" }));
  answer(hasPictures);
  await vi.waitFor(() => expect(capturer.peekPictures(file)).toBe(hasPictures));
  // The screen learns the answer only after the probe's own callback, which may run after the check above.
  await act(async () => undefined);
  return rendered;
}

async function saveOpenFlashcard(
  client: ReturnType<typeof createFakeBackendClient>,
) {
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await screen.findByText("Flashcard saved to the project.");
  const body = bodyOf(
    requestsTo(client.requests, "POST", "/projects/p1/flashcards")[0],
  ) as Partial<Flashcard> | undefined;
  return body?.content?.screenshot;
}

const browserVideo = () =>
  new File([new Uint8Array([1, 2, 3])], "clip.mp4", { lastModified: 5 });

async function savedScreenshotOfNewFlashcard(
  client: ReturnType<typeof createFakeBackendClient>,
) {
  const list = await findSubtitles();
  await doubleClickWord(within(list).getByRole("button", { name: "cat" }));
  return saveOpenFlashcard(client);
}

const stripRect = {
  x: 0,
  y: 0,
  top: 0,
  left: 0,
  right: 600,
  bottom: 72,
  width: 600,
  height: 72,
  toJSON: () => undefined,
};

/**
 * Renders the screen with a saved flashcard and a ten-second file on a 600 px waveform strip, so one pixel is a sixtieth of a second.
 * The saved card's clip starts at 105 px and its screenshot marker sits at 144 px.
 */
async function renderWithWaveform() {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
    stripRect,
  );
  const rendered = renderMediaScreen([savedFlashcard]);
  act(() => rendered.store.dispatch(actions.playerDurationChanged(10)));
  await findSubtitles();
  return rendered;
}

const findStrip = () =>
  screen.getByRole("slider", { name: "Playback position" });

function dragOnStrip(fromX: number, toX: number, clientY = 36) {
  const strip = findStrip();
  const at = (clientX: number) => ({
    clientX,
    clientY,
    pointerId: 1,
    isPrimary: true,
  });
  fireEvent.pointerDown(strip, at(fromX));
  fireEvent.pointerMove(strip, at(toX));
  fireEvent.pointerUp(strip, at(toX));
}

async function openSavedFlashcardFromStrip() {
  await vi.waitFor(() =>
    fireEvent.doubleClick(findStrip(), { clientX: 140, clientY: 36 }),
  );
  await screen.findByRole("form", { name: "Flashcard" });
}

async function findSubtitles() {
  await screen.findByRole("button", { name: "night" });
  return screen.getByRole("list", { name: "Subtitles" });
}

function requestsTo(requests: BackendRequest[], method: string, path: string) {
  return requests.filter(
    (request) => request.method === method && request.path === path,
  );
}

function bodyOf(request: BackendRequest | undefined): unknown {
  return request?.body?.kind === "json" ? request.body.value : undefined;
}

/** Clicks a word in the subtitles panel and waits for the dictionary pop-up. */
async function lookUpInPanel(word: string) {
  const list = await findSubtitles();
  fireEvent.click(within(list).getByRole("button", { name: word }));
  return screen.findByRole("dialog", { name: "Dictionary" });
}

const playbackCalls = (effects: { calls: { type: string }[] }) =>
  effects.calls
    .map((call) => call.type)
    .filter((type) => type === "playPlayer" || type === "pausePlayer");

const findPopup = () => screen.findByRole("dialog", { name: "Dictionary" });

const queryPopup = () => screen.queryByRole("dialog", { name: "Dictionary" });

/** Waits for the pop-up to show the word in its header. */
const findPopupShowing = async (word: string) =>
  within(await findPopup()).findByText(word, { selector: "header *" });

const panelWord = (word: string) =>
  within(screen.getByRole("list", { name: "Subtitles" })).getByRole("button", {
    name: word,
  });

const lookupTexts = (client: ReturnType<typeof createFakeBackendClient>) =>
  requestsTo(client.requests, "GET", "/dictionaries/lookup").map(
    (request) => request.query?.text,
  );

const wait = (ms: number) =>
  act(() => new Promise<void>((resolve) => setTimeout(resolve, ms)));

/** Holds a touch on an element long enough to count as a held tap, then lifts it. */
async function holdTouch(element: HTMLElement) {
  fireEvent.pointerDown(element, { pointerType: "touch" });
  await wait(600);
  fireEvent.pointerUp(element, { pointerType: "touch" });
  fireEvent.click(element, { detail: 1 });
}

describe("MediaScreen lookup gestures", () => {
  it("places the pop-up at the clicked word", async () => {
    renderMediaScreen();
    const popup = await lookUpInPanel("cat");
    expect(popup.closest("[data-side]")).not.toBeNull();
  });

  it("moves the pop-up to another word tapped while it is open", async () => {
    renderMediaScreen();
    await lookUpInPanel("cat");
    fireEvent.click(panelWord("dog"), { detail: 1 });
    expect(await findPopupShowing("dog")).toBeDefined();
  });

  it("follows the mouse once it rests on another word", async () => {
    renderMediaScreen();
    await lookUpInPanel("cat");
    fireEvent.pointerEnter(panelWord("dog"), { pointerType: "mouse" });
    expect(await findPopupShowing("dog")).toBeDefined();
  });

  it("does not follow the mouse while the pointer is inside the pop-up", async () => {
    renderMediaScreen();
    const popup = await lookUpInPanel("cat");
    fireEvent.pointerEnter(popup, { pointerType: "mouse" });
    fireEvent.pointerEnter(panelWord("dog"), { pointerType: "mouse" });
    await wait(250);
    expect(
      within(popup).getByText("cat", { selector: "header *" }),
    ).toBeDefined();
  });

  it("looks nothing up for words hovered inside the pop-up", async () => {
    const { client } = renderMediaScreen();
    const popup = await lookUpInPanel("cat");
    const devour = await within(popup).findByRole("button", { name: "devour" });
    fireEvent.pointerEnter(devour, { pointerType: "mouse" });
    await wait(250);
    expect(lookupTexts(client)).toEqual(["cat is sleeping."]);
  });

  it("closes when the word it shows is clicked again", async () => {
    renderMediaScreen();
    await lookUpInPanel("cat");
    fireEvent.click(panelWord("cat"), { detail: 1 });
    await vi.waitFor(() => expect(queryPopup()).toBeNull());
  });

  it("closes at once when the word it shows is activated from the keyboard", async () => {
    renderMediaScreen();
    await lookUpInPanel("cat");
    fireEvent.click(panelWord("cat"), { detail: 0 });
    expect(queryPopup()).toBeNull();
  });

  it("looks a double-clicked word up once, for both the pop-up and the flashcard", async () => {
    const { client } = renderMediaScreen();
    await findSubtitles();
    await doubleClickWord(panelWord("cat"));
    expect(lookupTexts(client)).toEqual(["cat is sleeping."]);
  });

  it("fills a double-clicked word's flashcard with the definitions in the translation language", async () => {
    renderMediaScreen();
    await findSubtitles();
    await doubleClickWord(panelWord("cat"));
    expect(
      (screen.getByLabelText("Definition (en)") as HTMLTextAreaElement).value,
    ).toMatch(/^to eat \(of an animal\); to devour\n/);
  });

  it("replaces the pop-up with the flashcard editor on a double-click", async () => {
    renderMediaScreen();
    await findSubtitles();
    await doubleClickWord(panelWord("cat"));
    expect(queryPopup()).toBeNull();
  });

  it("turns the word the pop-up shows into a flashcard on a double-click, without closing it and resuming playback", async () => {
    const { effects, store } = renderMediaScreen();
    act(() => store.dispatch(actions.playerPlayingChanged(true)));
    await lookUpInPanel("cat");
    act(() => store.dispatch(actions.playerPlayingChanged(false)));
    await doubleClickWord(panelWord("cat"));
    await wait(350);
    expect(playbackCalls(effects)).toEqual(["pausePlayer"]);
  });

  it("starts a flashcard filled from the lookup on a held tap", async () => {
    renderMediaScreen();
    await findSubtitles();
    await holdTouch(panelWord("cat"));
    await screen.findByRole("form", { name: "Flashcard" });
    expect(
      (screen.getByLabelText("Word (de)") as HTMLTextAreaElement).value,
    ).toBe("fressen");
  });

  describe("for a word inside the pop-up", () => {
    it("looks a clicked word up in the pop-up", async () => {
      renderMediaScreen();
      const popup = await lookUpInPanel("cat");
      fireEvent.click(
        await within(popup).findByRole("button", { name: "devour" }),
        { detail: 1 },
      );
      expect(await findPopupShowing("devour")).toBeDefined();
    });

    it("starts a flashcard from its lookup on a double-click", async () => {
      const { client } = renderMediaScreen();
      const popup = await lookUpInPanel("cat");
      await doubleClickWord(
        await within(popup).findByRole("button", { name: "devour" }),
      );
      expect(lookupTexts(client)).toEqual(["cat is sleeping.", "devour"]);
    });

    it("starts a flashcard on a held tap", async () => {
      renderMediaScreen();
      const popup = await lookUpInPanel("cat");
      await holdTouch(
        await within(popup).findByRole("button", { name: "devour" }),
      );
      expect(
        await screen.findByRole("form", { name: "Flashcard" }),
      ).toBeDefined();
    });
  });
});

describe("MediaScreen lookup", () => {
  it("looks a clicked word up with its cue as context", async () => {
    const { client } = renderMediaScreen();
    await lookUpInPanel("cat");
    await vi.waitFor(() =>
      expect(
        requestsTo(client.requests, "GET", "/dictionaries/lookup")[0]?.query,
      ).toEqual({
        text: "cat is sleeping.",
        language: "de",
        context: "The cat is sleeping.",
        offset: "4",
      }),
    );
  });

  it("shows the entries of a clicked word in the dictionary pop-up", async () => {
    renderMediaScreen();
    const popup = await lookUpInPanel("cat");
    expect(
      await within(popup).findByRole("button", { name: "devour" }),
    ).toBeDefined();
  });

  it("fills a flashcard made from the pop-up with the definitions in the translation language", async () => {
    renderMediaScreen();
    const popup = await lookUpInPanel("cat");
    fireEvent.click(
      await within(popup).findByRole("button", { name: "Flashcard" }),
    );
    expect(
      (screen.getByLabelText("Definition (en)") as HTMLTextAreaElement).value,
    ).toMatch(/^to eat \(of an animal\); to devour\n/);
  });

  it("takes the word of a flashcard made from the pop-up from the dictionary", async () => {
    renderMediaScreen();
    const popup = await lookUpInPanel("cat");
    fireEvent.click(
      await within(popup).findByRole("button", { name: "Flashcard" }),
    );
    expect(
      (screen.getByLabelText("Word (de)") as HTMLTextAreaElement).value,
    ).toBe("fressen");
  });

  it("closes the pop-up on Escape", async () => {
    renderMediaScreen();
    await lookUpInPanel("cat");
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Dictionary" })).toBeNull();
  });

  it("pauses playback while the pop-up is open", async () => {
    const { effects, store } = renderMediaScreen();
    act(() => store.dispatch(actions.playerPlayingChanged(true)));
    await lookUpInPanel("cat");
    expect(playbackCalls(effects)).toEqual(["pausePlayer"]);
  });

  it("resumes playback when the pop-up closes", async () => {
    const { effects, store } = renderMediaScreen();
    act(() => store.dispatch(actions.playerPlayingChanged(true)));
    await lookUpInPanel("cat");
    act(() => store.dispatch(actions.playerPlayingChanged(false)));
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(playbackCalls(effects)).toEqual(["pausePlayer", "playPlayer"]);
  });

  it("closes the pop-up on a click outside it", async () => {
    renderMediaScreen();
    await lookUpInPanel("cat");
    fireEvent.click(screen.getByRole("heading", { name: "episode.mkv" }));
    expect(screen.queryByRole("dialog", { name: "Dictionary" })).toBeNull();
  });

  it("keeps playback paused once a flashcard is started from the pop-up", async () => {
    const { effects, store } = renderMediaScreen();
    act(() => store.dispatch(actions.playerPlayingChanged(true)));
    const popup = await lookUpInPanel("cat");
    act(() => store.dispatch(actions.playerPlayingChanged(false)));
    fireEvent.click(
      await within(popup).findByRole("button", { name: "Flashcard" }),
    );
    fireEvent.click(screen.getByRole("heading", { name: "episode.mkv" }));
    expect(playbackCalls(effects)).toEqual(["pausePlayer"]);
  });

  it("does not search the dictionaries when none covers the project's language", async () => {
    const { client } = renderMediaScreen(
      [],
      [dictionarySummary("jmdict", "ja", "en")],
    );
    const popup = await lookUpInPanel("cat");
    await within(popup).findByRole("button", { name: "Add a dictionary" });
    expect(requestsTo(client.requests, "GET", "/dictionaries/lookup")).toEqual(
      [],
    );
  });

  describe("when Add a dictionary is pressed in the pop-up", () => {
    async function pressAddDictionary() {
      const rendered = renderMediaScreen(
        [],
        [dictionarySummary("jmdict", "ja", "en")],
      );
      act(() => rendered.store.dispatch(actions.playerPlayingChanged(true)));
      const popup = await lookUpInPanel("cat");
      act(() => rendered.store.dispatch(actions.playerPlayingChanged(false)));
      fireEvent.click(
        await within(popup).findByRole("button", { name: "Add a dictionary" }),
      );
      return rendered;
    }

    it("opens the dictionaries settings", async () => {
      const { navigation } = await pressAddDictionary();
      expect(navigation.dictionariesOpenCount).toBe(1);
    });

    it("keeps playback paused behind them", async () => {
      const { effects } = await pressAddDictionary();
      expect(playbackCalls(effects)).toEqual(["pausePlayer"]);
    });
  });

  it("asks for a dictionary when none covers the project's language", async () => {
    renderMediaScreen([], [dictionarySummary("jmdict", "ja", "en")]);
    const popup = await lookUpInPanel("cat");
    expect(
      await within(popup).findByRole("button", { name: "Add a dictionary" }),
    ).toBeDefined();
  });

  it("opens the pop-up's search field with the L key", async () => {
    renderMediaScreen();
    await findSubtitles();
    fireEvent.keyDown(document.body, { key: "l" });
    expect(
      screen.getByRole("textbox", { name: "Word to look up" }),
    ).toBeDefined();
  });
});

describe("MediaScreen", () => {
  it("lists one card per cue of the target-language subtitles", async () => {
    renderMediaScreen();
    const list = await findSubtitles();
    expect(within(list).getAllByRole("listitem")).toHaveLength(4);
  });

  it("seeks the player to a cue's start when its time is clicked", async () => {
    const { effects } = renderMediaScreen();
    const list = await findSubtitles();
    fireEvent.click(
      within(list).getAllByRole("button", {
        name: "Play from 0:00",
      })[0] as HTMLElement,
    );
    expect(effects.calls).toContainEqual({ type: "seekPlayer", seconds: 0.5 });
  });

  it("requests a subtitles file when one is to be added", async () => {
    const { effects } = renderMediaScreen();
    await findSubtitles();
    fireEvent.click(
      screen.getByRole("button", { name: "Add a subtitles file" }),
    );
    expect(effects.calls).toContainEqual({
      type: "pickFile",
      accept: [".srt", ".vtt"],
    });
  });

  it("adds a picked subtitles file as the translation beside the shown subtitles", async () => {
    const { effects, client } = renderMediaScreen();
    await findSubtitles();
    fireEvent.click(
      screen.getByRole("button", { name: "Add a subtitles file" }),
    );
    act(() =>
      effects.resolvePickFile({
        name: "english.srt",
        source: {
          kind: "inline",
          text: "1\n00:00:01,000 --> 00:00:02,000\nHi",
        },
      }),
    );
    await vi.waitFor(() =>
      expect(
        bodyOf(
          requestsTo(
            client.requests,
            "POST",
            "/projects/p1/media/m1/subtitles",
          )[0],
        ),
      ).toMatchObject({ name: "english.srt", role: "translation" }),
    );
  });

  it("opens the flashcard editor with a word double-clicked in the subtitles", async () => {
    renderMediaScreen();
    const list = await findSubtitles();
    await doubleClickWord(within(list).getByRole("button", { name: "cat" }));
    expect(
      (screen.getByLabelText("Word (de)") as HTMLTextAreaElement).value,
    ).toBe("fressen");
  });

  it("takes a new flashcard's sentence from the cue whose word was double-clicked", async () => {
    renderMediaScreen();
    const list = await findSubtitles();
    await doubleClickWord(within(list).getByRole("button", { name: "dog" }));
    expect(
      (screen.getByLabelText("Sentence (de)") as HTMLTextAreaElement).value,
    ).toBe("The dog wants to eat.\nIt is hungry.");
  });

  it("saves a new flashcard in the project", async () => {
    const { client } = renderMediaScreen();
    const list = await findSubtitles();
    await doubleClickWord(within(list).getByRole("button", { name: "cat" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await vi.waitFor(() =>
      expect(
        bodyOf(
          requestsTo(client.requests, "POST", "/projects/p1/flashcards")[0],
        ),
      ).toMatchObject({ media_file_id: "m1", content: { word: "fressen" } }),
    );
  });

  it("tells the user once the flashcard is saved", async () => {
    renderMediaScreen();
    const list = await findSubtitles();
    await doubleClickWord(within(list).getByRole("button", { name: "cat" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(
      await screen.findByText("Flashcard saved to the project."),
    ).toBeDefined();
  });

  it("shows the waveform strip", () => {
    renderMediaScreen();
    expect(
      screen.getByRole("slider", { name: "Playback position" }),
    ).toBeDefined();
  });

  it("asks the player to play when Play is clicked", () => {
    const { effects } = renderMediaScreen();
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(effects.calls).toContainEqual({ type: "togglePlayer" });
  });

  it("closes the media file when Project is clicked", () => {
    const { store } = renderMediaScreen();
    fireEvent.click(screen.getByRole("button", { name: "Project" }));
    expect(selectCurrentMediaFileId(store.getState())).toBeNull();
  });

  describe("when a flashcard's segment is dragged on the waveform", () => {
    it("saves the moved clip at once while the flashcard is closed", async () => {
      const { client } = await renderWithWaveform();
      await vi.waitFor(() => {
        dragOnStrip(105, 90);
        expect(
          requestsTo(client.requests, "PUT", "/projects/p1/flashcards/f1"),
        ).toHaveLength(1);
      });
      expect(
        bodyOf(
          requestsTo(client.requests, "PUT", "/projects/p1/flashcards/f1")[0],
        ),
      ).toMatchObject({ content: { audio_context: { start_ms: 1500 } } });
    });

    it("leaves the moved clip unsaved while the flashcard is open", async () => {
      const { client } = await renderWithWaveform();
      await openSavedFlashcardFromStrip();
      dragOnStrip(105, 90);
      await act(() => new Promise((resolve) => setTimeout(resolve, 10)));
      expect(
        requestsTo(client.requests, "PUT", "/projects/p1/flashcards/f1"),
      ).toHaveLength(0);
    });

    it("shows the moved clip in the open flashcard's editor", async () => {
      await renderWithWaveform();
      await openSavedFlashcardFromStrip();
      dragOnStrip(105, 90);
      const clipStart = await screen.findByRole("slider", {
        name: "Clip start",
      });
      expect(clipStart.getAttribute("aria-valuenow")).toBe("1500");
    });

    it("saves the moved clip with the open flashcard", async () => {
      const { client } = await renderWithWaveform();
      await openSavedFlashcardFromStrip();
      dragOnStrip(105, 90);
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
      await screen.findByText("Flashcard saved to the project.");
      expect(
        bodyOf(
          requestsTo(client.requests, "PUT", "/projects/p1/flashcards/f1").at(
            -1,
          ),
        ),
      ).toMatchObject({ content: { audio_context: { start_ms: 1500 } } });
    });

    it("saves the moved screenshot time with the open flashcard", async () => {
      const { client } = await renderWithWaveform();
      await openSavedFlashcardFromStrip();
      dragOnStrip(144, 156, 5);
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
      await screen.findByText("Flashcard saved to the project.");
      expect(
        bodyOf(
          requestsTo(client.requests, "PUT", "/projects/p1/flashcards/f1").at(
            -1,
          ),
        ),
      ).toMatchObject({ content: { screenshot: { at_ms: 2600 } } });
    });

    it("moves the clip of a new flashcard that is not saved yet", async () => {
      const { client } = await renderWithWaveform();
      await doubleClickWord(
        within(screen.getByRole("list", { name: "Subtitles" })).getByRole(
          "button",
          { name: "cat" },
        ),
      );
      dragOnStrip(30, 15);
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
      await vi.waitFor(() =>
        expect(
          bodyOf(
            requestsTo(client.requests, "POST", "/projects/p1/flashcards")[0],
          ),
        ).toMatchObject({ content: { audio_context: { start_ms: 250 } } }),
      );
    });
  });

  describe("with a video the browser added", () => {
    it("takes a new flashcard's screenshot while the browser holds the file", async () => {
      const { client } = renderBrowserVideoScreen(browserVideo());
      expect(await savedScreenshotOfNewFlashcard(client)).toEqual({
        at_ms: 1000,
      });
    });

    it("shows the screenshot captured from the file", async () => {
      renderBrowserVideoScreen(browserVideo());
      const list = await findSubtitles();
      await doubleClickWord(within(list).getByRole("button", { name: "cat" }));
      const thumbnail = await screen.findByAltText("Screenshot from the video");
      expect(thumbnail.getAttribute("src")).toBe("frame-at-1");
    });

    it("leaves the screenshot out of a new flashcard once the file turns out to have no pictures", async () => {
      const file = browserVideo();
      const capturer = createFakeFrameCapturer(false);
      const { client } = renderBrowserVideoScreen(file, capturer);
      await vi.waitFor(() => expect(capturer.peekPictures(file)).toBe(false));
      expect(await savedScreenshotOfNewFlashcard(client)).toBeNull();
    });

    it("gives a new flashcard started before the probe a screenshot once the file shows pictures", async () => {
      const { client } = await startFlashcardBeforeProbe(true);
      expect(await saveOpenFlashcard(client)).toEqual({ at_ms: 1000 });
    });

    it("leaves the screenshot out of a new flashcard started before the probe finds no pictures", async () => {
      const { client } = await startFlashcardBeforeProbe(false);
      expect(await saveOpenFlashcard(client)).toBeNull();
    });

    it("shows no screenshot field before the probe answers", async () => {
      const { capturer } = createWaitingFrameCapturer();
      renderBrowserVideoScreen(browserVideo(), capturer);
      const list = await findSubtitles();
      await doubleClickWord(within(list).getByRole("button", { name: "cat" }));
      expect(screen.queryByLabelText("Include the screenshot")).toBeNull();
    });

    it("leaves the screenshot out of a new flashcard once the browser no longer holds the file", async () => {
      const { client } = renderBrowserVideoScreen(null);
      expect(await savedScreenshotOfNewFlashcard(client)).toBeNull();
    });
  });
});
