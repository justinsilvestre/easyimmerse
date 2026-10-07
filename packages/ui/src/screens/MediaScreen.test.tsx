import { resetBackend } from "@easyimmerse/backend";
import {
  actions,
  createBrowserFileRegistry,
  selectCurrentMediaFileId,
  selectPreference,
} from "@easyimmerse/state";
import type { Flashcard, MediaFile } from "@easyimmerse/types";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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
import { fakeServer } from "../testSupport/mediaFixtureResponses.ts";
import {
  bodyOf,
  createdDraftOf,
  doubleClickWord,
  findSubtitles,
  renderMediaScreen,
  requestsTo,
  savedFlashcard,
} from "../testSupport/renderMediaScreen.tsx";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { MediaScreen } from "./MediaScreen.tsx";

afterEach(() => {
  cleanup();
  resetBackend();
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
        createdDraftOf(
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
      await screen.findByText("Saved the flashcard for “fressen”."),
    ).toBeDefined();
  });

  it("starts with the waveform strip hidden", () => {
    renderMediaScreen();
    expect(
      screen.queryByRole("slider", { name: "Playback position" }),
    ).toBeNull();
  });

  it("shows no lasting bar above the video once a flashcard is saved", async () => {
    renderMediaScreen();
    const list = await findSubtitles();
    await doubleClickWord(within(list).getByRole("button", { name: "cat" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByText("Saved the flashcard for “fressen”.");
    expect(screen.queryByText("Flashcard saved to the project.")).toBeNull();
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
    fireEvent.click(screen.getByRole("radio", { name: "Strong" }));
    expect(
      JSON.parse(
        selectPreference("subtitleAppearance")(store.getState()) ?? "{}",
      ).textShadow,
    ).toBe("strong");
  });

  it("seeks to a new flashcard's clip start once it opens", async () => {
    const { effects } = renderMediaScreen();
    const list = await findSubtitles();
    await doubleClickWord(within(list).getByRole("button", { name: "cat" }));
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
      await doubleClickWord(within(list).getByRole("button", { name: "cat" }));
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

    it("shows the subtitles again once it closes", async () => {
      await openFlashcard();
      fireEvent.click(
        screen.getByRole("button", { name: "Close without saving" }),
      );
      expect(screen.getByRole("list", { name: "Subtitles" })).toBeDefined();
    });
  });

  describe("after the first cue's end", () => {
    /** Moves the player through the given times in turn, as playback or seeks would. */
    function moveThrough(
      store: ReturnType<typeof renderMediaScreen>["store"],
      seconds: number[],
    ) {
      for (const at of seconds)
        act(() => store.dispatch(actions.playerTimeChanged(at)));
    }

    const toggleSubtitlesPanel = () =>
      fireEvent.click(screen.getByRole("button", { name: "Subtitles panel" }));

    const activeCard = () =>
      screen
        .getByRole("list", { name: "Subtitles" })
        .querySelector<HTMLElement>("[aria-current]");

    const catOverVideo = () =>
      within(screen.getByTestId("subtitle-box")).queryByRole("button", {
        name: "cat",
      });

    it("keeps the cue over the video while playback carries on from it", async () => {
      const { store } = renderMediaScreen();
      await findSubtitles();
      moveThrough(store, [1, 1.4, 1.6]);
      expect(catOverVideo()).not.toBeNull();
    });

    it("shows no cue over the video after a seek into the gap after it", async () => {
      const { store } = renderMediaScreen();
      await findSubtitles();
      moveThrough(store, [4.6, 1.6]);
      expect(catOverVideo()).toBeNull();
    });

    it("marks the held cue's card active when the subtitles panel opens meanwhile", async () => {
      const { store } = renderMediaScreen();
      await findSubtitles();
      toggleSubtitlesPanel();
      moveThrough(store, [1, 1.4, 1.6]);
      toggleSubtitlesPanel();
      expect(activeCard()?.textContent).toContain("cat");
    });
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
        expect(store.getState().app.player.currentTimeSeconds).toBe(1.75),
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
          createdDraftOf(
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
