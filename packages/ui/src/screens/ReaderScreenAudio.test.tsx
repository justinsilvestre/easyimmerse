import {
  actions,
  type BrowserFileRegistry,
  createBrowserFileRegistry,
} from "@easyimmerse/state";
import type { Alignment, MediaFile } from "@easyimmerse/types";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { exampleAudioAlignment } from "../reader/exampleAudioAlignment.ts";
import { exampleShortBook } from "../reader/exampleDocuments.ts";
import { spokenHighlightName } from "../reader/readerTextHighlights.ts";
import { paragraphAttribute } from "../reader/textOffsets.ts";
import { createFakeBackendClient } from "../testSupport/createFakeBackendClient.ts";
import {
  fixtureProject,
  fixtureResponses,
} from "../testSupport/fixtureResponses.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { ReaderScreen } from "./ReaderScreen.tsx";

const bookFile: MediaFile = {
  id: "b1",
  project_id: "p1",
  name: "sample.epub",
  source: { kind: "path", path: "/books/sample.epub" },
  created_at_ms: 0,
  track_selection_json: null,
  origin: null,
  translation_media_file_id: null,
  is_upload_chosen: false,
};

const heldAudio = new File([new Uint8Array([1, 2, 3])], "sample.mp3", {
  lastModified: 5,
});

/** The fixture's audio, which the browser holds. */
const audioFile: MediaFile = {
  ...bookFile,
  id: "a1",
  name: "sample.mp3",
  source: { kind: "browser_file", size: 3, last_modified_ms: 5 },
};

/** A highlight as the CSS Custom Highlight API keeps it, for a test environment that lacks the API. */
class FakeHighlight {
  readonly ranges: Range[];
  priority = 0;
  constructor(...ranges: Range[]) {
    this.ranges = ranges;
  }
}

const highlights = new Map<string, FakeHighlight>();
const restorers: (() => void)[] = [];

beforeEach(() => {
  vi.stubGlobal("CSS", { highlights });
  vi.stubGlobal("Highlight", FakeHighlight);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  highlights.clear();
  for (const restore of restorers.splice(0)) restore();
});

/** Stands in for the browser's layout, which the test environment lacks. */
function override(target: object, name: string, value: unknown) {
  Object.defineProperty(target, name, { value, configurable: true });
  restorers.push(() => Reflect.deleteProperty(target, name));
}

/** Makes the point under the pointer lie on the first occurrence of `word` in the chapter. */
function pointAt(word: string) {
  const paragraph = [
    ...document.querySelectorAll(`[${paragraphAttribute}]`),
  ].find((element) => element.textContent?.includes(word));
  override(document, "caretPositionFromPoint", () => ({
    offsetNode: paragraph?.firstChild,
    offset: paragraph?.textContent?.indexOf(word) ?? 0,
  }));
  override(Range.prototype, "getClientRects", () => [
    new DOMRect(0, 0, 100, 100),
  ]);
}

/** Renders the reader on the short example book, aligned with the browser's audio file unless `alignments` say otherwise. */
async function renderReader({
  alignments = [exampleAudioAlignment(audioFile.id)],
}: {
  alignments?: Alignment[];
} = {}) {
  const registry: BrowserFileRegistry<File> = createBrowserFileRegistry();
  registry.register(heldAudio);
  const client = createFakeBackendClient({
    ...fixtureResponses,
    "GET /projects/p1/media": { media_files: [bookFile, audioFile] },
    "GET /projects/p1/media/b1/alignments": { alignments },
    "POST /documents/parse-local": exampleShortBook,
  });
  const rendered = renderWithAppStore(
    <ReaderScreen project={fixtureProject} mediaFileId={bookFile.id} />,
    client,
    { browserFileRegistry: registry },
  );
  act(() => {
    rendered.store.dispatch(actions.preferencesLoaded({}));
    rendered.store.dispatch(
      actions.openMediaFileRequested(fixtureProject.id, bookFile.id),
    );
  });
  await screen.findByRole("heading", { level: 2 });
  return rendered;
}

const playButton = () =>
  screen.findByRole("button", { name: "Play the audio (K)" });

const chapterHeading = () => screen.findByRole("heading", { level: 2 });

/** The text the spoken highlight covers, or null when nothing is highlighted. */
const spokenText = () =>
  highlights.get(spokenHighlightName)?.ranges[0]?.toString() ?? null;

function ctrlClick() {
  const text = screen.getByRole("main");
  const point = { clientX: 10, clientY: 10 };
  fireEvent.pointerDown(text, { ...point, pointerType: "mouse" });
  fireEvent.click(text, { ...point, detail: 1, ctrlKey: true });
}

describe("ReaderScreen with a book aligned with audio", () => {
  it("shows the audio player", async () => {
    await renderReader();
    expect(await playButton()).toBeDefined();
  });

  it("shows no audio player for a book with no alignment", async () => {
    await renderReader({ alignments: [] });
    expect(screen.queryByRole("button", { name: /the audio/ })).toBeNull();
  });

  it("shows no audio player when the audio file is no longer in the project", async () => {
    await renderReader({ alignments: [exampleAudioAlignment("gone")] });
    expect(screen.queryByRole("button", { name: /the audio/ })).toBeNull();
  });

  it("plays the audio file the browser holds", async () => {
    await renderReader();
    await playButton();
    expect(screen.getByLabelText("Audio").getAttribute("src")).toMatch(
      /^blob:/,
    );
  });

  it("highlights the sentence spoken at the player's time", async () => {
    const { store } = await renderReader();
    await playButton();
    act(() => store.dispatch(actions.playerTimeChanged(1)));
    expect(spokenText()).toBe("The dog wants to eat, and it is hungry.");
  });

  it("highlights nothing before the audio has played", async () => {
    await renderReader();
    await playButton();
    expect(spokenText()).toBeNull();
  });

  it("highlights nothing between sentences", async () => {
    const { store } = await renderReader();
    await playButton();
    act(() => store.dispatch(actions.playerTimeChanged(0.75)));
    expect(spokenText()).toBeNull();
  });

  it("turns to the chapter of the sentence spoken while playing", async () => {
    const { store } = await renderReader();
    await playButton();
    act(() => {
      store.dispatch(actions.playerPlayingChanged(true));
      store.dispatch(actions.playerTimeChanged(1.7));
    });
    expect((await chapterHeading()).textContent).toBe("Chapter Two");
  });

  it("leaves a chapter the reader turned to while the spoken sentence lay elsewhere", async () => {
    const { store } = await renderReader();
    await playButton();
    act(() => {
      store.dispatch(actions.playerPlayingChanged(true));
      store.dispatch(actions.playerTimeChanged(0.1));
    });
    fireEvent.keyDown(document.body, { key: "ArrowRight" });
    await screen.findByRole("heading", { level: 2, name: "Chapter Two" });
    act(() => store.dispatch(actions.playerTimeChanged(0.9)));
    expect((await chapterHeading()).textContent).toBe("Chapter Two");
  });

  it("seeks to the start of a sentence Ctrl-clicked", async () => {
    const { effects } = await renderReader();
    await playButton();
    pointAt("dog");
    ctrlClick();
    expect(effects.calls).toContainEqual({ type: "seekPlayer", seconds: 0.8 });
  });

  it("plays from a sentence Ctrl-clicked", async () => {
    const { effects } = await renderReader();
    await playButton();
    pointAt("dog");
    ctrlClick();
    expect(effects.calls).toContainEqual({ type: "playPlayer" });
  });

  it("plays the sentence being spoken from its start on R", async () => {
    const { store, effects } = await renderReader();
    await playButton();
    act(() => store.dispatch(actions.playerTimeChanged(1)));
    fireEvent.keyDown(document.body, { key: "r" });
    expect(effects.calls).toContainEqual({ type: "seekPlayer", seconds: 0.8 });
  });

  it("leaves R to the browser before anything is spoken or pointed at", async () => {
    const { effects } = await renderReader();
    await playButton();
    fireEvent.keyDown(document.body, { key: "r" });
    expect(effects.calls).not.toContainEqual({ type: "playPlayer" });
  });

  it("plays a sentence from the play button in the dictionary pop-up's sentence row", async () => {
    const { effects } = await renderReader();
    await playButton();
    pointAt("dog");
    const text = screen.getByRole("main");
    const point = { clientX: 10, clientY: 10 };
    fireEvent.pointerDown(text, { ...point, pointerType: "mouse" });
    fireEvent.click(text, { ...point, detail: 1 });
    const popup = await screen.findByRole("dialog", { name: "Dictionary" });
    fireEvent.click(
      await within(popup).findByRole("button", {
        name: "Play the sentence (R)",
      }),
    );
    expect(effects.calls).toContainEqual({ type: "seekPlayer", seconds: 0.8 });
  });

  it("plays and pauses on K", async () => {
    const { effects } = await renderReader();
    await playButton();
    fireEvent.keyDown(document.body, { key: "k" });
    expect(effects.calls).toContainEqual({ type: "togglePlayer" });
  });
});
