import { actions, selectRoute } from "@easyimmerse/state";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { doubleClick } from "../testSupport/doubleClick.ts";
import {
  dictionarySummary,
  findCreatedDraft,
  findSubtitles,
  playbackCalls,
  renderMediaScreen,
  requestsTo,
} from "../testSupport/renderMediaScreen.tsx";

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
  await vi.waitFor(() => expect(shownWord(popup)).toBe(word));
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
