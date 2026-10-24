import { actions, selectRoute } from "@easyimmerse/state";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { doubleClick } from "../../testSupport/doubleClick.ts";
import { fixtureResponses } from "../../testSupport/fixtureResponses.ts";
import {
  dictionarySummary,
  findCreatedDraft,
  findSubtitles,
  playbackCalls,
  renderMediaScreen,
  requestsTo,
} from "../../testSupport/renderMediaScreen.tsx";

afterEach(cleanup);

type Client = ReturnType<typeof renderMediaScreen>["client"];

/** Clicks a word in the subtitles panel and waits for the dictionary pop-up. */
async function lookUpInPanel(word: string) {
  const list = await findSubtitles();
  fireEvent.click(within(list).getByRole("button", { name: word }), {
    detail: 1,
  });
  return screen.findByRole("dialog", { name: "Dictionary" });
}

const queryPopup = () => screen.queryByRole("dialog", { name: "Dictionary" });

/** The word the pop-up shows, as its field holds it. */
const shownWord = (popup: HTMLElement) =>
  within(popup).getByRole<HTMLInputElement>("textbox", {
    name: "Word to look up",
  }).value;

/** Waits for the pop-up to show the word in its field. */
const findPopupShowing = async (word: string) => {
  const popup = await screen.findByRole("dialog", { name: "Dictionary" });
  await waitFor(() => expect(shownWord(popup)).toBe(word));
  return popup;
};

const panelWord = (word: string) =>
  within(screen.getByRole("list", { name: "Subtitles" })).getByRole("button", {
    name: word,
  });

const lookupTexts = (client: Client) =>
  requestsTo(client.requests, "GET", "/dictionaries/lookup").map(
    (request) => request.query?.text,
  );

const fieldValue = (label: string) =>
  (screen.getByLabelText(label) as HTMLTextAreaElement).value;

const findCreatedContent = async (client: Client) =>
  (await findCreatedDraft(client)).content;

const uncoveredLanguage = {
  dictionaries: [dictionarySummary("jmdict", "ja", "en")],
};

describe("MediaScreen lookup", () => {
  it("looks a clicked word up with its cue as context", async () => {
    const { client } = renderMediaScreen();
    await lookUpInPanel("cat");
    await waitFor(() =>
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

  it("stands the pop-up at the clicked word", async () => {
    renderMediaScreen();
    const popup = await lookUpInPanel("cat");
    expect(
      popup.closest("[data-side]")?.getAttribute("data-side"),
    ).toBeTruthy();
  });

  it("follows the mouse once it rests on another word", async () => {
    renderMediaScreen();
    await lookUpInPanel("cat");
    fireEvent.pointerEnter(panelWord("dog"), { pointerType: "mouse" });
    expect(await findPopupShowing("dog")).toBeDefined();
  });

  it("closes once the double-click interval has passed after the word it shows is clicked again", async () => {
    const { advanceClock } = renderMediaScreen();
    await lookUpInPanel("cat");
    fireEvent.click(panelWord("cat"), { detail: 1 });
    advanceClock(500);
    expect(queryPopup()).toBeNull();
  });

  it("shows a word double-clicked inside it", async () => {
    renderMediaScreen();
    const popup = await lookUpInPanel("cat");
    doubleClick(await within(popup).findByRole("button", { name: "devour" }));
    expect(await findPopupShowing("devour")).toBeDefined();
  });

  it("saves a flashcard from its button with the dictionary's word", async () => {
    const { client } = renderMediaScreen();
    const popup = await lookUpInPanel("cat");
    fireEvent.click(
      await within(popup).findByRole("button", { name: "New flashcard" }),
    );
    expect((await findCreatedContent(client)).word).toBe("fressen");
  });

  it("saves a flashcard for a word held inside it", async () => {
    const { client } = renderMediaScreen();
    const popup = await lookUpInPanel("cat");
    const devour = await within(popup).findByRole("button", { name: "devour" });
    // The hold is the gesture's own half-second timer, which runs in real time.
    fireEvent.pointerDown(devour, { pointerType: "touch" });
    const draft = await findCreatedDraft(client);
    expect(draft.content.word).toBe("fressen");
  });

  it("pauses playback while it is open and resumes it when it closes", async () => {
    const { effects, store } = renderMediaScreen();
    act(() => store.dispatch(actions.playerPlayingChanged(true)));
    await lookUpInPanel("cat");
    act(() => store.dispatch(actions.playerPlayingChanged(false)));
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(playbackCalls(effects)).toEqual(["pausePlayer", "playPlayer"]);
  });

  it("closes on a click outside it", async () => {
    renderMediaScreen();
    await lookUpInPanel("cat");
    fireEvent.click(screen.getByRole("heading", { name: "episode.mkv" }));
    expect(queryPopup()).toBeNull();
  });

  describe("on a double-click on a word", () => {
    async function doubleClickCat(
      setup: Parameters<typeof renderMediaScreen>[0] = {},
    ) {
      const rendered = renderMediaScreen(setup);
      await findSubtitles();
      doubleClick(panelWord("cat"));
      return rendered;
    }

    it("saves a flashcard filled from the word's lookup", async () => {
      const { client } = await doubleClickCat();
      expect((await findCreatedContent(client)).word).toBe("fressen");
    });

    it("looks the word up once, for both the pop-up and the flashcard", async () => {
      const { client } = await doubleClickCat();
      await findCreatedContent(client);
      expect(lookupTexts(client)).toEqual(["cat is sleeping."]);
    });

    it("closes the pop-up once the flashcard is made", async () => {
      const { client } = await doubleClickCat();
      await findCreatedContent(client);
      expect(queryPopup()).toBeNull();
    });

    it("says that it is making a flashcard while the lookup has not answered", async () => {
      await doubleClickCat({ heldLookups: ["cat is sleeping."] });
      expect(
        await screen.findByText("Making a flashcard for “cat”…"),
      ).toBeDefined();
    });
  });

  describe("on a held word of the subtitles", () => {
    async function holdInPanel(word: string, pointerType: "touch" | "mouse") {
      const rendered = renderMediaScreen();
      await findSubtitles();
      // The hold is the gesture's own half-second timer, which runs in real time.
      fireEvent.pointerDown(panelWord(word), { pointerType, button: 0 });
      const popup = await screen.findByRole("dialog", { name: "Dictionary" });
      return { ...rendered, popup };
    }

    it("opens the pop-up on a word held with a finger", async () => {
      const { popup } = await holdInPanel("cat", "touch");
      expect(shownWord(popup)).toBe("cat");
    });

    it("opens the pop-up on a word held with the mouse button", async () => {
      const { popup } = await holdInPanel("cat", "mouse");
      expect(shownWord(popup)).toBe("cat");
    });

    it("makes no flashcard", async () => {
      const { client } = await holdInPanel("cat", "touch");
      expect(
        requestsTo(client.requests, "POST", "/projects/p1/flashcards"),
      ).toEqual([]);
    });

    it("offers no translation while the file has no translation subtitles", async () => {
      const { popup } = await holdInPanel("cat", "touch");
      expect(
        within(popup).queryByRole("button", { name: /translation/ }),
      ).toBeNull();
    });
  });

  describe("with translation subtitles", () => {
    const translationTrack = {
      id: "s2",
      media_file_id: "m1",
      name: "sample.en.srt",
      format: "srt",
      sample: "Die Katze schläft.",
      created_at_ms: 0,
    };
    const translationCues = [
      { index: 1, start_ms: 500, end_ms: 1500, text: "Die Katze schläft." },
      {
        index: 2,
        start_ms: 1750,
        end_ms: 3000,
        text: "Der Hund will fressen.",
      },
    ];
    const tracks = fixtureResponses["GET /projects/p1/media/m1/subtitles"];

    function renderWithTranslation() {
      return renderMediaScreen({
        responses: {
          "GET /projects/p1/media/m1/subtitles": {
            tracks: [...tracks.tracks, translationTrack],
            selection: { target_track_id: "s1", translation_track_id: "s2" },
          },
          "GET /projects/p1/media/m1/subtitles/s2/cues": {
            format: "srt",
            cues: translationCues,
          },
        },
      });
    }

    /** Hides the translation subtitles over the video and closes the subtitles panel, so that no translation is on screen. */
    function hideTranslations(
      store: ReturnType<typeof renderMediaScreen>["store"],
    ) {
      act(() => {
        store.dispatch(actions.subtitleDisplayCycled());
        store.dispatch(actions.cuePanelToggled());
      });
    }

    it("offers no translation in the sentence row while the translation subtitles are on screen", async () => {
      renderWithTranslation();
      const popup = await lookUpInPanel("cat");
      await waitFor(() =>
        expect(
          within(popup).getByRole("button", { name: /cue/ }),
        ).toBeDefined(),
      );
      expect(
        within(popup).queryByRole("button", { name: /translation/ }),
      ).toBeNull();
    });

    it("shows the held word's cue's translation in the sentence row once the translation subtitles are hidden", async () => {
      const { store } = renderWithTranslation();
      await findSubtitles();
      hideTranslations(store);
      // With the panel closed, the only "cat" is the word over the video, where the first cue shows.
      act(() => store.dispatch(actions.playerTimeChanged(1)));
      fireEvent.pointerDown(screen.getByRole("button", { name: "cat" }), {
        pointerType: "touch",
      });
      const popup = await screen.findByRole("dialog", { name: "Dictionary" });
      expect(
        await within(popup).findByText("Die Katze schläft."),
      ).toBeDefined();
    });

    it("shows the current cue's translation in the sentence row on T with no lookup cursor", async () => {
      const { store } = renderWithTranslation();
      await findSubtitles();
      hideTranslations(store);
      act(() => store.dispatch(actions.playerTimeChanged(2)));
      fireEvent.keyDown(document.body, { key: "t" });
      const popup = await screen.findByRole("dialog", { name: "Dictionary" });
      expect(
        await within(popup).findByText("Der Hund will fressen."),
      ).toBeDefined();
    });

    it("hides the sentence row's translation on T again", async () => {
      const { store } = renderWithTranslation();
      await findSubtitles();
      hideTranslations(store);
      act(() => store.dispatch(actions.playerTimeChanged(2)));
      fireEvent.keyDown(document.body, { key: "t" });
      const popup = await screen.findByRole("dialog", { name: "Dictionary" });
      await within(popup).findByText("Der Hund will fressen.");
      fireEvent.keyDown(document.body, { key: "t" });
      expect(within(popup).queryByText("Der Hund will fressen.")).toBeNull();
    });
  });

  describe("with the E key while the mouse is on a word", () => {
    async function pressEOnCat(
      setup: Parameters<typeof renderMediaScreen>[0] = {},
    ) {
      const rendered = renderMediaScreen(setup);
      await findSubtitles();
      fireEvent.pointerEnter(panelWord("cat"), { pointerType: "mouse" });
      fireEvent.keyDown(document.body, { key: "e" });
      return rendered;
    }

    it("opens the flashcard editor filled from the lookup", async () => {
      await pressEOnCat();
      await screen.findByRole("form", { name: "Flashcard" });
      expect(fieldValue("Word (de)")).toBe("fressen");
    });

    it("opens the flashcard with the word once 1.5 seconds pass without an answer", async () => {
      const { advanceClock } = await pressEOnCat({
        heldLookups: ["cat is sleeping."],
      });
      advanceClock(1500);
      await screen.findByRole("form", { name: "Flashcard" });
      expect(fieldValue("Word (de)")).toBe("cat");
    });
  });

  describe("when no dictionary covers the project's language", () => {
    it("asks for a dictionary", async () => {
      renderMediaScreen(uncoveredLanguage);
      const popup = await lookUpInPanel("cat");
      expect(
        await within(popup).findByRole("button", { name: "Add a dictionary" }),
      ).toBeDefined();
    });

    it("does not search the dictionaries", async () => {
      const { client } = renderMediaScreen(uncoveredLanguage);
      const popup = await lookUpInPanel("cat");
      await within(popup).findByRole("button", { name: "Add a dictionary" });
      expect(lookupTexts(client)).toEqual([]);
    });
  });

  describe("when Add a dictionary is pressed in the pop-up", () => {
    async function pressAddDictionary() {
      const rendered = renderMediaScreen(uncoveredLanguage);
      act(() => rendered.store.dispatch(actions.playerPlayingChanged(true)));
      const popup = await lookUpInPanel("cat");
      act(() => rendered.store.dispatch(actions.playerPlayingChanged(false)));
      fireEvent.click(
        await within(popup).findByRole("button", { name: "Add a dictionary" }),
      );
      return rendered;
    }

    it("opens the dictionaries settings", async () => {
      const { store } = await pressAddDictionary();
      expect(selectRoute(store.getState())).toEqual({
        screen: "settings",
        beneath: { screen: "media", projectId: "p1", mediaFileId: "m1" },
        pages: ["dictionaries"],
      });
    });

    it("keeps playback paused behind them", async () => {
      const { effects } = await pressAddDictionary();
      expect(playbackCalls(effects)).toEqual(["pausePlayer"]);
    });
  });

  it("opens the pop-up's search field with the L key", async () => {
    renderMediaScreen();
    await findSubtitles();
    fireEvent.keyDown(document.body, { key: "l" });
    expect(
      screen.getByRole("textbox", { name: "Word to look up" }),
    ).toBeDefined();
  });

  it("looks up the word under the mouse with the L key", async () => {
    renderMediaScreen();
    await findSubtitles();
    fireEvent.pointerEnter(panelWord("dog"), { pointerType: "mouse" });
    fireEvent.keyDown(document.body, { key: "l" });
    expect(await findPopupShowing("dog")).toBeDefined();
  });
});
