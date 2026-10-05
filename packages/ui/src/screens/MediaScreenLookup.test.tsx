import { resetBackend } from "@easyimmerse/backend";
import { actions } from "@easyimmerse/state";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { createFakeBackendClient } from "../testSupport/createFakeBackendClient.ts";
import {
  createdDraftOf,
  dictionarySummary,
  doubleClick,
  findSubtitles,
  playbackCalls,
  renderMediaScreen,
  requestsTo,
} from "../testSupport/renderMediaScreen.tsx";

afterEach(() => {
  cleanup();
  resetBackend();
  vi.restoreAllMocks();
});

/** Clicks a word in the subtitles panel and waits for the dictionary pop-up. */
async function lookUpInPanel(word: string) {
  const list = await findSubtitles();
  fireEvent.click(within(list).getByRole("button", { name: word }), {
    detail: 1,
  });
  return screen.findByRole("dialog", { name: "Dictionary" });
}

const queryPopup = () => screen.queryByRole("dialog", { name: "Dictionary" });

/** Waits for the pop-up to show the word in its header. */
const findPopupShowing = async (word: string) =>
  within(await screen.findByRole("dialog", { name: "Dictionary" })).findByText(
    word,
    { selector: "header *" },
  );

const panelWord = (word: string) =>
  within(screen.getByRole("list", { name: "Subtitles" })).getByRole("button", {
    name: word,
  });

const lookupTexts = (client: ReturnType<typeof createFakeBackendClient>) =>
  requestsTo(client.requests, "GET", "/dictionaries/lookup").map(
    (request) => request.query?.text,
  );

const fieldValue = (label: string) =>
  (screen.getByLabelText(label) as HTMLTextAreaElement).value;

const editor = () => screen.queryByRole("form", { name: "Flashcard" });

/** Advances the faked timers, letting the screen update in between. */
const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

/** Taps an element with a finger. */
function tap(element: HTMLElement) {
  fireEvent.pointerDown(element, { pointerType: "touch" });
  fireEvent.pointerUp(element, { pointerType: "touch" });
  fireEvent.click(element, { detail: 1 });
}

/** Holds a finger on an element long enough to count as a held tap, then lifts it. */
async function holdTouch(element: HTMLElement) {
  fireEvent.pointerDown(element, { pointerType: "touch" });
  await advance(600);
  fireEvent.pointerUp(element, { pointerType: "touch" });
  fireEvent.click(element, { detail: 1 });
}

/** Rests the mouse on an element for as long as it takes to count as pointing at it. */
async function restMouseOn(element: HTMLElement) {
  fireEvent.pointerEnter(element, { pointerType: "mouse" });
  await advance(150);
}

describe("MediaScreen lookup gestures", () => {
  // Only timeouts are faked, so that the queries' polling keeps real time.
  // Timeouts already due, such as the zero-delay ones the data layer schedules, keep running;
  // the gestures' own waits pass only when a test advances the time.
  let flushDue: ReturnType<typeof setInterval>;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    flushDue = setInterval(() => vi.advanceTimersByTime(0), 5);
  });

  afterEach(() => {
    clearInterval(flushDue);
    vi.useRealTimers();
  });

  it("places the pop-up above a clicked word low on the screen", async () => {
    renderMediaScreen();
    await findSubtitles();
    vi.spyOn(panelWord("cat"), "getBoundingClientRect").mockReturnValue(
      new DOMRect(100, 700, 40, 20),
    );
    const popup = await lookUpInPanel("cat");
    expect((popup.closest("[data-side]") as HTMLElement).style.bottom).toBe(
      `${window.innerHeight - 700 + 8}px`,
    );
  });

  it("moves the pop-up to another word tapped while it is open", async () => {
    renderMediaScreen();
    await lookUpInPanel("cat");
    tap(panelWord("dog"));
    expect(await findPopupShowing("dog")).toBeDefined();
  });

  it("follows the mouse once it rests on another word", async () => {
    renderMediaScreen();
    await lookUpInPanel("cat");
    await restMouseOn(panelWord("dog"));
    expect(await findPopupShowing("dog")).toBeDefined();
  });

  it("stays on its word when the mouse passes quickly over another", async () => {
    renderMediaScreen();
    const popup = await lookUpInPanel("cat");
    fireEvent.pointerEnter(panelWord("dog"), { pointerType: "mouse" });
    await advance(100);
    fireEvent.pointerLeave(panelWord("dog"), { pointerType: "mouse" });
    await advance(200);
    expect(
      within(popup).getByText("cat", { selector: "header *" }),
    ).toBeDefined();
  });

  it("does not follow the mouse while the pointer is inside the pop-up", async () => {
    renderMediaScreen();
    const popup = await lookUpInPanel("cat");
    fireEvent.pointerEnter(popup, { pointerType: "mouse" });
    await restMouseOn(panelWord("dog"));
    expect(
      within(popup).getByText("cat", { selector: "header *" }),
    ).toBeDefined();
  });

  it("looks nothing up for words hovered inside the pop-up", async () => {
    const { client } = renderMediaScreen();
    const popup = await lookUpInPanel("cat");
    await restMouseOn(
      await within(popup).findByRole("button", { name: "devour" }),
    );
    expect(lookupTexts(client)).toEqual(["cat is sleeping."]);
  });

  describe("when the word it shows is clicked again", () => {
    it("stays open within the double-click interval", async () => {
      renderMediaScreen();
      await lookUpInPanel("cat");
      fireEvent.click(panelWord("cat"), { detail: 1 });
      await advance(450);
      expect(queryPopup()).not.toBeNull();
    });

    it("closes once the double-click interval has passed", async () => {
      renderMediaScreen();
      await lookUpInPanel("cat");
      fireEvent.click(panelWord("cat"), { detail: 1 });
      await advance(500);
      expect(queryPopup()).toBeNull();
    });
  });

  it("closes once the double-tap interval has passed when the word it shows is tapped", async () => {
    renderMediaScreen();
    await lookUpInPanel("cat");
    tap(panelWord("cat"));
    await advance(500);
    expect(queryPopup()).toBeNull();
  });

  it("starts a flashcard filled from the lookup on a double tap", async () => {
    renderMediaScreen();
    await findSubtitles();
    tap(panelWord("cat"));
    await advance(250);
    tap(panelWord("cat"));
    await screen.findByRole("form", { name: "Flashcard" });
    expect(fieldValue("Word (de)")).toBe("fressen");
  });

  it("starts a flashcard on a double tap on the word it shows, without closing first", async () => {
    renderMediaScreen();
    await lookUpInPanel("cat");
    tap(panelWord("cat"));
    await advance(250);
    tap(panelWord("cat"));
    expect(
      await screen.findByRole("form", { name: "Flashcard" }),
    ).toBeDefined();
  });

  it("closes at once when the word it shows is activated from the keyboard", async () => {
    renderMediaScreen();
    await lookUpInPanel("cat");
    fireEvent.click(panelWord("cat"), { detail: 0 });
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

    it("looks the word up once, for both the pop-up and the flashcard", async () => {
      const { client } = await doubleClickCat();
      await screen.findByRole("form", { name: "Flashcard" });
      expect(lookupTexts(client)).toEqual(["cat is sleeping."]);
    });

    it("fills the flashcard with the definitions in the translation language", async () => {
      await doubleClickCat();
      await screen.findByRole("form", { name: "Flashcard" });
      expect(fieldValue("Definition (en)")).toMatch(
        /^to eat \(of an animal\); to devour\n/,
      );
    });

    it("opens the flashcard editor instead of the pop-up", async () => {
      await doubleClickCat();
      await screen.findByRole("form", { name: "Flashcard" });
      expect(queryPopup()).toBeNull();
    });

    it("says that it is making a flashcard while the lookup has not answered", async () => {
      await doubleClickCat({ unansweredLookups: ["cat is sleeping."] });
      expect(
        await screen.findByText("Making a flashcard for “cat”…"),
      ).toBeDefined();
    });

    it("opens the flashcard with the clicked word once 1.5 seconds pass without an answer", async () => {
      await doubleClickCat({ unansweredLookups: ["cat is sleeping."] });
      await advance(1500);
      expect(fieldValue("Word (de)")).toBe("cat");
    });

    describe("when the lookup answers after the flashcard has opened", () => {
      const lateLookup = { slowLookups: { "cat is sleeping.": 3000 } };

      it("fills the flashcard from it", async () => {
        await doubleClickCat(lateLookup);
        await advance(1500);
        await advance(1500);
        expect(fieldValue("Word (de)")).toBe("fressen");
      });

      it("leaves alone a field typed in before the answer", async () => {
        await doubleClickCat(lateLookup);
        await advance(1500);
        fireEvent.change(screen.getByLabelText("Word (de)"), {
          target: { value: "Kater" },
        });
        await advance(1500);
        expect(fieldValue("Word (de)")).toBe("Kater");
      });

      it("fills the fields the user has not typed in", async () => {
        await doubleClickCat(lateLookup);
        await advance(1500);
        fireEvent.change(screen.getByLabelText("Definition (en)"), {
          target: { value: "a small pet" },
        });
        await advance(1500);
        expect(fieldValue("Word (de)")).toBe("fressen");
      });

      it("leaves alone a definition typed in before the answer", async () => {
        await doubleClickCat(lateLookup);
        await advance(1500);
        fireEvent.change(screen.getByLabelText("Definition (en)"), {
          target: { value: "a small pet" },
        });
        await advance(1500);
        expect(fieldValue("Definition (en)")).toBe("a small pet");
      });

      it("saves at once once the word has been changed before Save", async () => {
        const { client } = await doubleClickCat(lateLookup);
        await advance(1500);
        fireEvent.change(screen.getByLabelText("Word (de)"), {
          target: { value: "Kater" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Save" }));
        await vi.waitFor(() =>
          expect(
            requestsTo(client.requests, "POST", "/projects/p1/flashcards"),
          ).toHaveLength(1),
        );
      });

      it("fills nothing once the word has been changed before the answer", async () => {
        await doubleClickCat(lateLookup);
        await advance(1500);
        fireEvent.change(screen.getByLabelText("Word (de)"), {
          target: { value: "Kater" },
        });
        await advance(1500);
        expect(fieldValue("Definition (en)")).toBe("");
      });

      describe("when Save is pressed before the answer", () => {
        async function pressSaveBeforeAnswer(
          setup: Parameters<typeof renderMediaScreen>[0] = lateLookup,
        ) {
          const rendered = await doubleClickCat(setup);
          await advance(1500);
          fireEvent.click(screen.getByRole("button", { name: "Save" }));
          return rendered;
        }

        const savedContent = (
          client: ReturnType<typeof createFakeBackendClient>,
        ) =>
          (
            createdDraftOf(
              requestsTo(client.requests, "POST", "/projects/p1/flashcards")[0],
            ) as
              | { content?: { word?: string; l1_definition?: string } }
              | undefined
          )?.content;

        const savedWord = (
          client: ReturnType<typeof createFakeBackendClient>,
        ) => savedContent(client)?.word;

        it("says that it waits for the definitions", async () => {
          await pressSaveBeforeAnswer();
          expect(
            within(screen.getByRole("form", { name: "Flashcard" })).getByRole(
              "status",
            ).textContent,
          ).toBe("Waiting for definitions…");
        });

        it("sends nothing while it waits, so that no answer can arrive during the save", async () => {
          const { client } = await pressSaveBeforeAnswer();
          await advance(1000);
          expect(
            requestsTo(client.requests, "POST", "/projects/p1/flashcards"),
          ).toEqual([]);
        });

        it("saves the flashcard filled from the answer once it arrives", async () => {
          const { client } = await pressSaveBeforeAnswer();
          await advance(1500);
          await vi.waitFor(() => expect(savedWord(client)).toBe("fressen"));
        });

        it("sends nothing before a failing lookup fails", async () => {
          const { client } = await pressSaveBeforeAnswer({
            failingLookups: { "cat is sleeping.": 3000 },
          });
          await advance(1000);
          expect(
            requestsTo(client.requests, "POST", "/projects/p1/flashcards"),
          ).toEqual([]);
        });

        it("keeps the word as it was once Save is pressed", async () => {
          await pressSaveBeforeAnswer();
          fireEvent.change(screen.getByLabelText("Word (de)"), {
            target: { value: "Kater" },
          });
          expect(fieldValue("Word (de)")).toBe("cat");
        });

        it("saves a definition typed in before Save as typed, with the word from the answer", async () => {
          const { client } = await doubleClickCat(lateLookup);
          await advance(1500);
          fireEvent.change(screen.getByLabelText("Definition (en)"), {
            target: { value: "a small pet" },
          });
          fireEvent.click(screen.getByRole("button", { name: "Save" }));
          await advance(1500);
          await vi.waitFor(() =>
            expect(savedContent(client)).toMatchObject({
              word: "fressen",
              l1_definition: "a small pet",
            }),
          );
        });

        it("saves the flashcard as it is once the lookup fails", async () => {
          const { client } = await pressSaveBeforeAnswer({
            failingLookups: { "cat is sleeping.": 3000 },
          });
          await advance(1500);
          await vi.waitFor(() => expect(savedWord(client)).toBe("cat"));
        });
      });
    });

    it("drops the flashcard when another word is clicked before the lookup answers", async () => {
      await doubleClickCat({ unansweredLookups: ["cat is sleeping."] });
      fireEvent.click(panelWord("dog"), { detail: 1 });
      await advance(1500);
      expect(editor()).toBeNull();
    });

    it("drops the flashcard when Escape is pressed before the lookup answers", async () => {
      await doubleClickCat({ unansweredLookups: ["cat is sleeping."] });
      fireEvent.keyDown(document.body, { key: "Escape" });
      await advance(1500);
      expect(editor()).toBeNull();
    });

    it("keeps the flashcard when the mouse rests on another word before the lookup answers", async () => {
      await doubleClickCat({ unansweredLookups: ["cat is sleeping."] });
      await restMouseOn(panelWord("dog"));
      await advance(1500);
      expect(fieldValue("Word (de)")).toBe("cat");
    });
  });

  it("counts a second click 400 ms after the first as a double-click", async () => {
    renderMediaScreen();
    await lookUpInPanel("cat");
    await advance(400);
    fireEvent.click(panelWord("cat"), { detail: 2 });
    expect(
      await screen.findByRole("form", { name: "Flashcard" }),
    ).toBeDefined();
  });

  it("keeps playback paused on a double-click on the word the pop-up shows", async () => {
    const { effects, store } = renderMediaScreen();
    act(() => store.dispatch(actions.playerPlayingChanged(true)));
    await lookUpInPanel("cat");
    act(() => store.dispatch(actions.playerPlayingChanged(false)));
    doubleClick(panelWord("cat"));
    await screen.findByRole("form", { name: "Flashcard" });
    await advance(600);
    expect(playbackCalls(effects)).toEqual(["pausePlayer"]);
  });

  it("starts a flashcard filled from the lookup on a held tap", async () => {
    renderMediaScreen();
    await findSubtitles();
    await holdTouch(panelWord("cat"));
    await screen.findByRole("form", { name: "Flashcard" });
    expect(fieldValue("Word (de)")).toBe("fressen");
  });

  describe("for a word inside the pop-up", () => {
    async function findDevour() {
      const popup = await lookUpInPanel("cat");
      return within(popup).findByRole("button", { name: "devour" });
    }

    it("starts looking a clicked word up at once", async () => {
      const { client } = renderMediaScreen();
      fireEvent.click(await findDevour(), { detail: 1 });
      expect(lookupTexts(client)).toEqual(["cat is sleeping.", "devour"]);
    });

    it("keeps showing the first word during the double-click interval", async () => {
      renderMediaScreen();
      fireEvent.click(await findDevour(), { detail: 1 });
      await advance(450);
      expect(
        within(queryPopup() as HTMLElement).getByText("cat", {
          selector: "header *",
        }),
      ).toBeDefined();
    });

    it("shows a clicked word once the double-click interval has passed", async () => {
      renderMediaScreen();
      fireEvent.click(await findDevour(), { detail: 1 });
      await advance(500);
      expect(await findPopupShowing("devour")).toBeDefined();
    });

    it("starts a flashcard from its lookup on a double-click", async () => {
      const { client } = renderMediaScreen();
      doubleClick(await findDevour());
      await screen.findByRole("form", { name: "Flashcard" });
      expect(lookupTexts(client)).toEqual(["cat is sleeping.", "devour"]);
    });

    it("says that it is making a flashcard while the lookup has not answered", async () => {
      renderMediaScreen({ unansweredLookups: ["devour"] });
      doubleClick(await findDevour());
      expect(
        await screen.findByText("Making a flashcard for “devour”…"),
      ).toBeDefined();
    });

    it("starts a flashcard on a double tap", async () => {
      renderMediaScreen();
      const devour = await findDevour();
      tap(devour);
      await advance(250);
      tap(devour);
      expect(
        await screen.findByRole("form", { name: "Flashcard" }),
      ).toBeDefined();
    });

    it("starts a flashcard on a held tap", async () => {
      renderMediaScreen();
      await holdTouch(await findDevour());
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
    const { client } = renderMediaScreen({
      dictionaries: [dictionarySummary("jmdict", "ja", "en")],
    });
    const popup = await lookUpInPanel("cat");
    await within(popup).findByRole("button", { name: "Add a dictionary" });
    expect(requestsTo(client.requests, "GET", "/dictionaries/lookup")).toEqual(
      [],
    );
  });

  describe("when Add a dictionary is pressed in the pop-up", () => {
    async function pressAddDictionary() {
      const rendered = renderMediaScreen({
        dictionaries: [dictionarySummary("jmdict", "ja", "en")],
      });
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
    renderMediaScreen({
      dictionaries: [dictionarySummary("jmdict", "ja", "en")],
    });
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
