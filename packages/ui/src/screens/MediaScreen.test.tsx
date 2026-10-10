import { type FrameCapturer, hasProbedPictures } from "@easyimmerse/backend";
import {
  actions,
  createBrowserFileRegistry,
  selectCurrentMediaFileId,
  selectCurrentTime,
  selectNotices,
  selectPreference,
} from "@easyimmerse/state";
import type {
  Flashcard,
  MediaFile,
  PluginForm,
  SourceStepResponse,
} from "@easyimmerse/types";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFrameCapturer } from "../player/browserFrameCapturer.ts";
import type { FrameSource } from "../player/captureVideoFrame.ts";
import {
  createFakeBackendClient,
  fakeFailure,
} from "../testSupport/createFakeBackendClient.ts";
import { createFakeFrameCapturer } from "../testSupport/createFakeFrameCapturer.ts";
import { doubleClick } from "../testSupport/doubleClick.ts";
import {
  fixtureImportedMediaFiles,
  fixtureMediaFiles,
  fixtureMediaSourcePlugin,
  fixtureProject,
  fixtureResponses,
  fixtureSubtitleTracks,
  fixtureTrack,
} from "../testSupport/fixtureResponses.ts";
import {
  copyPlaybackRoutes,
  fakeServer,
} from "../testSupport/mediaFixtureResponses.ts";
import {
  bodyOf,
  createdDraftOf,
  findCreatedDraft,
  findSubtitles,
  openFlashcardFor,
  renderMediaScreen,
  requestsTo,
  savedFlashcard,
} from "../testSupport/renderMediaScreen.tsx";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { MediaScreen } from "./MediaScreen.tsx";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

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
    origin: null,
  };
  const client = createFakeBackendClient({
    ...fixtureResponses,
    "GET /projects/p1/media": { media_files: [mediaFile] },
    "GET /projects/p1/media/m3/subtitles": fixtureSubtitleTracks,
    "GET /projects/p1/media/m3/subtitles/s1/cues": fixtureTrack,
    "POST /projects/p1/flashcards": savedFlashcard,
  });
  const rendered = renderWithAppStore(
    <MediaScreen project={fixtureProject} mediaFileId="m3" />,
    client,
    {
      server: fakeServer,
      browserFileRegistry: registry,
      frameCapturer: capturer,
    },
  );
  act(() => {
    rendered.store.dispatch(actions.preferencesLoaded({}));
    rendered.store.dispatch(actions.openMediaFileRequested("p1", "m3"));
  });
  const pickedVideo = { name: mediaFile.name, source: mediaFile.source };
  return { ...rendered, client, pickedVideo };
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
  const { capturer, answer } = createWaitingFrameCapturer();
  const rendered = renderBrowserVideoScreen(browserVideo(), capturer);
  const list = await findSubtitles();
  await openFlashcardFor(within(list).getByRole("button", { name: "cat" }));
  answer(hasPictures);
  await vi.waitFor(() =>
    expect(
      hasProbedPictures(rendered.store.getState(), rendered.pickedVideo),
    ).toBe(true),
  );
  return rendered;
}

async function saveOpenFlashcard(
  client: ReturnType<typeof createFakeBackendClient>,
) {
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await screen.findByText(/^Saved the flashcard for/);
  const body = createdDraftOf(
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
  await openFlashcardFor(within(list).getByRole("button", { name: "cat" }));
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
  const rendered = renderMediaScreen({ flashcards: [savedFlashcard] });
  act(() => rendered.store.dispatch(actions.playerDurationChanged(10)));
  await findSubtitles();
  fireEvent.click(screen.getByRole("button", { name: "Waveform" }));
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

describe("MediaScreen", () => {
  it("opens the track choice from the Tracks button", async () => {
    const [episode, ...others] = fixtureMediaFiles.media_files;
    renderMediaScreen({
      responses: {
        "GET /projects/p1/media": {
          media_files: [
            { ...episode, track_selection_json: '{"video":0,"audio":1}' },
            ...others,
          ],
        },
      },
      playbackRoutes: copyPlaybackRoutes,
    });
    fireEvent.click(await screen.findByRole("button", { name: "Tracks" }));
    expect(screen.getByRole("dialog", { name: "Choose tracks" })).toBeDefined();
  });

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

  it("opens the flashcard editor for the word under the mouse with the E key", async () => {
    renderMediaScreen();
    const list = await findSubtitles();
    await openFlashcardFor(within(list).getByRole("button", { name: "cat" }));
    expect(
      (screen.getByLabelText("Word (de)") as HTMLTextAreaElement).value,
    ).toBe("fressen");
  });

  it("takes a new flashcard's sentence from the cue of the word it was started from", async () => {
    renderMediaScreen();
    const list = await findSubtitles();
    await openFlashcardFor(within(list).getByRole("button", { name: "dog" }));
    expect(
      (screen.getByLabelText("Sentence (de)") as HTMLTextAreaElement).value,
    ).toBe("The dog wants to eat.\nIt is hungry.");
  });

  it("saves a new flashcard in the project", async () => {
    const { client } = renderMediaScreen();
    const list = await findSubtitles();
    await openFlashcardFor(within(list).getByRole("button", { name: "cat" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await findCreatedDraft(client)).toMatchObject({
      media_file_id: "m1",
      content: { word: "fressen" },
    });
  });

  describe("on a double-click on a word of the subtitles", () => {
    async function doubleClickWord(word: string) {
      const rendered = renderMediaScreen();
      const list = await findSubtitles();
      doubleClick(within(list).getByRole("button", { name: word }));
      return rendered;
    }

    it("saves a flashcard for it filled from its lookup", async () => {
      const { client } = await doubleClickWord("cat");
      expect(await findCreatedDraft(client)).toMatchObject({
        media_file_id: "m1",
        content: { word: "fressen" },
      });
    });

    it("takes the flashcard's sentence from the word's cue", async () => {
      const { client } = await doubleClickWord("dog");
      expect(await findCreatedDraft(client)).toMatchObject({
        content: { text_context: "The dog wants to eat.\nIt is hungry." },
      });
    });

    it("tells the user once the flashcard is saved", async () => {
      await doubleClickWord("cat");
      expect(
        await screen.findByText("Saved the flashcard for “fressen”."),
      ).toBeDefined();
    });

    it("opens no flashcard in the editor", async () => {
      await doubleClickWord("cat");
      await screen.findByText("Saved the flashcard for “fressen”.");
      expect(screen.queryByRole("form", { name: "Flashcard" })).toBeNull();
    });

    it("shows no lasting bar above the video once the flashcard is saved", async () => {
      await doubleClickWord("cat");
      await screen.findByText("Saved the flashcard for “fressen”.");
      expect(screen.queryByText("Flashcard saved to the project.")).toBeNull();
    });
  });

  it("records which occurrence of a word in its cue a double-click made the flashcard from", async () => {
    const { client } = renderMediaScreen({
      cues: [{ index: 1, start_ms: 500, end_ms: 1500, text: "Go, go, go!" }],
      dictionaries: [],
    });
    const list = await screen.findByRole("list", { name: "Subtitles" });
    const goes = await within(list).findAllByRole("button", { name: "go" });
    doubleClick(goes[1] as HTMLElement);
    expect(await findCreatedDraft(client)).toMatchObject({
      content: { word: "go" },
      word_start: 8,
    });
  });

  it("saves a flashcard for no word from the subtitle shown with the New flashcard button", async () => {
    const { client } = renderMediaScreen();
    await findSubtitles();
    fireEvent.click(
      screen.getByRole("button", {
        name: "New flashcard from this subtitle (C)",
      }),
    );
    expect(await findCreatedDraft(client)).toMatchObject({
      content: { word: "" },
    });
  });

  describe("with the C key", () => {
    it("saves a flashcard for the word under the mouse, filled from its lookup", async () => {
      const { client } = renderMediaScreen();
      const list = await findSubtitles();
      fireEvent.pointerEnter(
        within(list).getByRole("button", { name: "dog" }),
        {
          pointerType: "mouse",
        },
      );
      fireEvent.keyDown(document.body, { key: "c" });
      expect(await findCreatedDraft(client)).toMatchObject({
        content: {
          word: "fressen",
          text_context: "The dog wants to eat.\nIt is hungry.",
        },
      });
    });

    it("saves a flashcard for no word while the mouse is on no word", async () => {
      const { client } = renderMediaScreen();
      await findSubtitles();
      fireEvent.keyDown(document.body, { key: "c" });
      expect(await findCreatedDraft(client)).toMatchObject({
        content: { word: "" },
      });
    });

    it("leaves the flashcard open in the editor as it is", async () => {
      const { client } = renderMediaScreen();
      const list = await findSubtitles();
      await openFlashcardFor(within(list).getByRole("button", { name: "cat" }));
      fireEvent.pointerEnter(
        within(list).getByRole("button", { name: "dog" }),
        {
          pointerType: "mouse",
        },
      );
      fireEvent.keyDown(document.body, { key: "c" });
      await findCreatedDraft(client);
      expect(
        (screen.getByLabelText("Sentence (de)") as HTMLTextAreaElement).value,
      ).toBe("The cat is sleeping.");
    });
  });

  describe("with the E key", () => {
    it("opens a flashcard for no word while the mouse is on no word", async () => {
      renderMediaScreen();
      await findSubtitles();
      fireEvent.keyDown(document.body, { key: "e" });
      expect(
        ((await screen.findByLabelText("Word (de)")) as HTMLTextAreaElement)
          .value,
      ).toBe("");
    });

    it("starts nothing while a flashcard is open in the editor", async () => {
      renderMediaScreen();
      const list = await findSubtitles();
      await openFlashcardFor(within(list).getByRole("button", { name: "cat" }));
      fireEvent.pointerEnter(
        within(list).getByRole("button", { name: "dog" }),
        {
          pointerType: "mouse",
        },
      );
      fireEvent.keyDown(document.body, { key: "e" });
      expect(screen.queryByRole("dialog", { name: "Dictionary" })).toBeNull();
    });
  });

  it("starts with the waveform strip hidden", () => {
    renderMediaScreen();
    expect(
      screen.queryByRole("slider", { name: "Playback position" }),
    ).toBeNull();
  });

  it("opens a saved flashcard from the mark on its cue's card", async () => {
    renderMediaScreen({ flashcards: [{ ...savedFlashcard, cue_index: 1 }] });
    fireEvent.click(
      await screen.findByRole("button", { name: "Open the flashcard" }),
    );
    expect(
      await screen.findByRole("form", { name: "Flashcard" }),
    ).toBeDefined();
  });

  it("marks the word a saved flashcard was made from in its cue's card", async () => {
    const card: Flashcard = {
      ...savedFlashcard,
      cue_index: 1,
      content: { ...savedFlashcard.content, word: "cat" },
    };
    renderMediaScreen({ flashcards: [card] });
    const list = await findSubtitles();
    await vi.waitFor(() =>
      expect(list.querySelector("[data-flashcard-word]")?.textContent).toBe(
        "cat",
      ),
    );
  });

  it("stores the subtitle appearance chosen in its dialog", async () => {
    const { store } = renderMediaScreen();
    await findSubtitles();
    fireEvent.click(screen.getByRole("button", { name: "Subtitle options" }));
    fireEvent.click(
      screen.getByRole("menuitem", { name: "Subtitle appearance…" }),
    );
    fireEvent.click(screen.getByRole("radio", { name: "Heavy" }));
    expect(
      JSON.parse(
        selectPreference("subtitleAppearance")(store.getState()) ?? "{}",
      ).textShadow,
    ).toBe("heavy");
  });

  it("seeks to a new flashcard's clip start once it opens", async () => {
    const { effects } = renderMediaScreen();
    const list = await findSubtitles();
    await openFlashcardFor(within(list).getByRole("button", { name: "cat" }));
    await vi.waitFor(() =>
      expect(
        effects.calls.filter((call) => call.type === "seekPlayer").at(-1),
      ).toEqual({
        type: "seekPlayer",
        seconds: 0.5,
      }),
    );
  });

  describe("while a flashcard is open", () => {
    async function openFlashcard() {
      const rendered = renderMediaScreen();
      const list = await findSubtitles();
      await openFlashcardFor(within(list).getByRole("button", { name: "cat" }));
      return rendered;
    }

    it("marks the subtitles panel's toggle unavailable", async () => {
      await openFlashcard();
      expect(
        screen
          .getByRole("button", { name: "Subtitles panel" })
          .getAttribute("aria-disabled"),
      ).toBe("true");
    });

    it("says why the subtitles panel's toggle is unavailable", async () => {
      await openFlashcard();
      expect(
        screen.getByRole("button", { name: "Subtitles panel" }).title,
      ).toBe("Close the flashcard to show the subtitles");
    });

    it("leaves the subtitles panel's toggle as it was when pressed", async () => {
      await openFlashcard();
      const toggle = screen.getByRole("button", { name: "Subtitles panel" });
      const before = toggle.getAttribute("aria-pressed");
      fireEvent.click(toggle);
      expect(toggle.getAttribute("aria-pressed")).toBe(before);
    });

    it("leaves the editor's text fields as they are when the playback speed changes", async () => {
      const { store } = await openFlashcard();
      const form = screen.getByRole("form", { name: "Flashcard" });
      const field = within(form).getAllByRole("textbox")[0];
      if (field) field.style.height = "321px";
      act(() => store.dispatch(actions.speedChangeRequested(1.5)));
      expect(field?.style.height).toBe("321px");
    });

    it("shows the subtitles again once it closes", async () => {
      await openFlashcard();
      fireEvent.click(
        screen.getByRole("button", { name: "Close without saving" }),
      );
      expect(screen.getByRole("list", { name: "Subtitles" })).toBeDefined();
    });
  });

  it("shows no cue over the video after a seek into the gap after the first cue", async () => {
    const { store } = renderMediaScreen();
    await findSubtitles();
    act(() => store.dispatch(actions.playerTimeChanged(1)));
    act(() => store.dispatch(actions.seekRequested(1.6)));
    expect(
      within(screen.getByTestId("subtitle-box")).queryByRole("button", {
        name: "cat",
      }),
    ).toBeNull();
  });

  it("asks the player to play when Play is clicked", () => {
    const { effects } = renderMediaScreen();
    fireEvent.click(screen.getByRole("button", { name: "Play (Space)" }));
    expect(effects.calls).toContainEqual({ type: "togglePlayer" });
  });

  it("asks the player to play when Space is pressed", () => {
    const { effects } = renderMediaScreen();
    fireEvent.keyDown(document.body, { key: " " });
    expect(effects.calls).toContainEqual({ type: "togglePlayer" });
  });

  it("leaves Space to the focused button rather than toggling playback", () => {
    const { effects } = renderMediaScreen();
    fireEvent.keyDown(screen.getByRole("button", { name: "Back to Alpha" }), {
      key: " ",
    });
    expect(effects.calls).not.toContainEqual({ type: "togglePlayer" });
  });

  it("asks the player to replay the cue when R is pressed", () => {
    const { effects } = renderMediaScreen();
    fireEvent.keyDown(document.body, { key: "r" });
    expect(effects.calls).toContainEqual({ type: "seekPlayer", seconds: 0 });
  });

  it("closes the media file when the way back to the project is clicked", () => {
    const { store } = renderMediaScreen();
    fireEvent.click(screen.getByRole("button", { name: "Back to Alpha" }));
    expect(selectCurrentMediaFileId(store.getState())).toBeNull();
  });

  describe("when a flashcard's segment is dragged on the waveform", () => {
    it("leaves the clip of a closed flashcard as it is", async () => {
      const { client } = await renderWithWaveform();
      await vi.waitFor(() =>
        expect(findStrip().getAttribute("aria-valuemax")).toBe("10"),
      );
      dragOnStrip(105, 90);
      await act(() => new Promise((resolve) => setTimeout(resolve, 10)));
      expect(
        requestsTo(client.requests, "PUT", "/projects/p1/flashcards/f1"),
      ).toHaveLength(0);
    });

    it("seeks to the clip's start once a flashcard is opened by a double-click", async () => {
      const { store } = await renderWithWaveform();
      await openSavedFlashcardFromStrip();
      await vi.waitFor(() =>
        expect(selectCurrentTime(store.getState())).toBe(1.75),
      );
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
      await screen.findByText(/^Saved the flashcard for/);
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
      await screen.findByText(/^Saved the flashcard for/);
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
      await openFlashcardFor(
        within(screen.getByRole("list", { name: "Subtitles" })).getByRole(
          "button",
          { name: "cat" },
        ),
      );
      dragOnStrip(30, 15);
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
      await vi.waitFor(() =>
        expect(
          createdDraftOf(
            requestsTo(client.requests, "POST", "/projects/p1/flashcards")[0],
          ),
        ).toMatchObject({ content: { audio_context: { start_ms: 250 } } }),
      );
    });
  });

  describe("for a file imported through a plugin", () => {
    const fetchForm: PluginForm = {
      title: "Subtitles from the video site",
      description: null,
      fields: [
        {
          id: "fetch",
          label: "Subtitles to fetch",
          hint: null,
          control: {
            kind: "choose-many",
            options: [{ id: "en", label: "English (automatic)", hint: null }],
            chosen: [],
          },
        },
      ],
      actions: [{ id: "apply", label: "Apply", style: "primary" }],
    };

    const applied = (
      skipped: { id: string; reason: string }[] = [],
    ): SourceStepResponse => ({
      kind: "applied",
      removed: [],
      tracks: fixtureSubtitleTracks.tracks,
      selection: fixtureSubtitleTracks.selection,
      skipped,
    });

    const renderImported = (
      step: unknown = applied(),
      plugins = [fixtureMediaSourcePlugin],
    ) =>
      renderMediaScreen({
        responses: {
          "GET /plugins": { plugins },
          "GET /projects/p1/media": fixtureImportedMediaFiles,
          "GET /projects/p1/media/m1/source-form": fetchForm,
          "POST /projects/p1/media/m1/source-step": step,
        },
      });

    /** Opens the plugin's media interface from the chip, checks the English track, and applies. */
    async function applyEnglish() {
      fireEvent.click(
        await screen.findByRole("button", { name: "Video site" }),
      );
      fireEvent.click(await screen.findByLabelText("English (automatic)"));
      fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    }

    it("shows a chip named after the plugin's title", async () => {
      renderImported();
      expect(
        await screen.findByRole("button", { name: "Video site" }),
      ).toBeDefined();
    });

    it("names a plugin that is not installed by its name, as unavailable", async () => {
      renderImported(applied(), []);
      expect(
        (
          await screen.findByRole("button", { name: "video-site" })
        ).getAttribute("aria-disabled"),
      ).toBe("true");
    });

    it("sends the applied form's input to the plugin", async () => {
      const { client } = renderImported();
      await applyEnglish();
      await vi.waitFor(() =>
        expect(
          bodyOf(
            requestsTo(
              client.requests,
              "POST",
              "/projects/p1/media/m1/source-step",
            )[0],
          ),
        ).toEqual({
          action: "apply",
          input: [{ field: "fetch", values: ["en"] }],
        }),
      );
    });

    it("closes the plugin's dialog once its changes are applied", async () => {
      renderImported();
      await applyEnglish();
      await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    });

    it("names the subtitles that the plugin's changes did not add", async () => {
      const { store } = renderImported(
        applied([{ id: "en", reason: "the plugin did not fetch it" }]),
      );
      await applyEnglish();
      await vi.waitFor(() =>
        expect(
          selectNotices(store.getState()).map((notice) => notice.message),
        ).toContain(
          "The subtitles “English (automatic)” were not added: the plugin did not fetch it.",
        ),
      );
    });

    it("stays open when changes sent before it was closed and opened again are applied", async () => {
      const stale = Promise.withResolvers<SourceStepResponse>();
      renderImported(() => stale.promise);
      await applyEnglish();
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      fireEvent.click(screen.getByRole("button", { name: "Video site" }));
      await screen.findByLabelText("English (automatic)");
      await act(async () => {
        stale.resolve(applied());
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
      expect(screen.queryByRole("dialog")).not.toBeNull();
    });

    it("asks the plugin for its form once when opened", async () => {
      const { client } = renderImported();
      fireEvent.click(
        await screen.findByRole("button", { name: "Video site" }),
      );
      await screen.findByLabelText("English (automatic)");
      await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
      expect(
        requestsTo(client.requests, "GET", "/projects/p1/media/m1/source-form"),
      ).toHaveLength(1);
    });

    it("shows no form from an earlier opening while asking the plugin again", async () => {
      const later = Promise.withResolvers<PluginForm>();
      const forms = [fetchForm, later.promise];
      renderMediaScreen({
        responses: {
          "GET /plugins": { plugins: [fixtureMediaSourcePlugin] },
          "GET /projects/p1/media": fixtureImportedMediaFiles,
          "GET /projects/p1/media/m1/source-form": () => forms.shift(),
        },
      });
      fireEvent.click(
        await screen.findByRole("button", { name: "Video site" }),
      );
      await screen.findByLabelText("English (automatic)");
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      fireEvent.click(screen.getByRole("button", { name: "Video site" }));
      await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
      expect(screen.queryByLabelText("English (automatic)")).toBeNull();
    });

    it("tells why the plugin's form could not load", async () => {
      renderMediaScreen({
        responses: {
          "GET /plugins": { plugins: [fixtureMediaSourcePlugin] },
          "GET /projects/p1/media": fixtureImportedMediaFiles,
          "GET /projects/p1/media/m1/source-form": fakeFailure({
            status: 502,
            message: "The plugin stopped.",
          }),
        },
      });
      fireEvent.click(
        await screen.findByRole("button", { name: "Video site" }),
      );
      expect(await screen.findByText(/The plugin stopped/)).toBeDefined();
    });

    it("shows the next form the plugin answers with", async () => {
      renderImported({
        kind: "form",
        form: { ...fetchForm, title: "Confirm the changes" },
      });
      await applyEnglish();
      expect(
        await screen.findByRole("heading", { name: "Confirm the changes" }),
      ).toBeDefined();
    });
  });

  it("shows no plugin chip for a file that no plugin imported", async () => {
    renderMediaScreen({
      responses: { "GET /plugins": { plugins: [fixtureMediaSourcePlugin] } },
    });
    await findSubtitles();
    expect(screen.queryByRole("button", { name: "Video site" })).toBeNull();
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
      await openFlashcardFor(within(list).getByRole("button", { name: "cat" }));
      const thumbnail = await screen.findByAltText("Screenshot from the video");
      expect(thumbnail.getAttribute("src")).toBe("frame-at-1");
    });

    it("leaves the screenshot out of a new flashcard once the file turns out to have no pictures", async () => {
      const { client, store, pickedVideo } = renderBrowserVideoScreen(
        browserVideo(),
        createFakeFrameCapturer(false),
      );
      await vi.waitFor(() =>
        expect(hasProbedPictures(store.getState(), pickedVideo)).toBe(true),
      );
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
      await openFlashcardFor(within(list).getByRole("button", { name: "cat" }));
      expect(screen.queryByLabelText("Include the screenshot")).toBeNull();
    });

    it("leaves the screenshot out of a new flashcard once the browser no longer holds the file", async () => {
      const { client } = renderBrowserVideoScreen(null);
      expect(await savedScreenshotOfNewFlashcard(client)).toBeNull();
    });
  });
});
