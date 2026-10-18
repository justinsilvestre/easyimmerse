import { describe, expect, it } from "vitest";
import type { AppAction } from "../app/appAction.ts";
import { actions } from "../app/appAction.ts";
import { stateAfter } from "../app/stateAfter.ts";
import { startNew } from "../flashcards/flashcardsTestSupport.ts";
import {
  alignedReaderCache,
  chosenTextWord,
  readerCacheWith,
  readingWith,
  spokenSegment,
  translationAlignment,
} from "../screen/readerScreen/readerTestSupport.ts";
import { emptyServerCache } from "../server/serverCacheWith.ts";
import { exampleKeyPress } from "./exampleKeyPress.ts";
import { bindAction, bindCommand } from "./keyBinding.ts";
import { selectReaderKeyBinding } from "./selectReaderKeyBinding.ts";

const openBook = actions.openMediaFileRequested("p1", "b1");
/** The reader on a book just opened, in the paged layout, after the actions given, with nothing in the server cache. */
const reading = (...done: AppAction[]) => ({
  app: stateAfter(openBook, ...done),
  backend: emptyServerCache,
});
const scrolling = () =>
  reading(
    actions.preferencesLoaded({
      readerPreferences: JSON.stringify({ layout: "scroll" }),
    }),
  );
const withPanel = () => reading(actions.readerPanelOpened("contents"));
const withPopup = () => reading(actions.lookupSearchOpened());

const openBookSearch = bindCommand({ type: "openBookSearch" });
const nextPage = bindCommand({ type: "turnPage", direction: "next" });
const previousPage = bindCommand({ type: "turnPage", direction: "previous" });
const lookupClosed = bindAction(actions.lookupClosed());
const lookedUp = bindAction(actions.lookupCursorLookedUp());
const translationClosed = bindAction(actions.readerTranslationPopupClosed());

const wordPlace = { chapterIndex: 0, paragraphIndex: 0, offset: 4 };
const rect = { top: 10, bottom: 30, left: 40, right: 80 };
/** The dictionary pop-up open on a word of the book's first sentence. */
const wordLookedUp = actions.lookupWordClicked(
  chosenTextWord(wordPlace, rect),
  "mouse",
);
const spokenPlace = { chapterIndex: 0, paragraphIndex: 1, offset: 0 };
/** The audio playing in its one segment. */
const speaking = actions.playerTimeChanged(spokenSegment.start_ms / 1000);
const translationShown = actions.readerTranslationPopupOpened(wordPlace, rect);

describe("selectReaderKeyBinding", () => {
  describe("on Ctrl+F or Cmd+F", () => {
    const find = exampleKeyPress("f", { hasCommandKey: true });

    it("opens the book search", () => {
      expect(selectReaderKeyBinding(reading(), find)).toEqual(openBookSearch);
    });

    it("opens the book search while a panel is open", () => {
      expect(selectReaderKeyBinding(withPanel(), find)).toEqual(openBookSearch);
    });

    it("opens the book search from a field", () => {
      const press = exampleKeyPress("f", {
        hasCommandKey: true,
        focus: "formField",
      });
      expect(selectReaderKeyBinding(reading(), press)).toEqual(openBookSearch);
    });

    it("leaves a key that the focused element has handled", () => {
      const press = exampleKeyPress("f", {
        hasCommandKey: true,
        isHandled: true,
      });
      expect(selectReaderKeyBinding(reading(), press)).toBeNull();
    });

    it("leaves the key to the browser's search beneath Settings", () => {
      const app = reading(actions.settingsRequested());
      expect(selectReaderKeyBinding(app, find)).toBeNull();
    });
  });

  describe("on Escape", () => {
    it("closes the translation of a sentence", () => {
      const root = readingWith(alignedReaderCache, translationShown);
      expect(selectReaderKeyBinding(root, exampleKeyPress("Escape"))).toEqual(
        translationClosed,
      );
    });

    it("closes the translation of a sentence from a field", () => {
      const root = readingWith(alignedReaderCache, translationShown);
      const press = exampleKeyPress("Escape", { focus: "formField" });
      expect(selectReaderKeyBinding(root, press)).toEqual(translationClosed);
    });

    it("closes the dictionary pop-up", () => {
      const press = exampleKeyPress("Escape");
      expect(selectReaderKeyBinding(withPopup(), press)).toEqual(lookupClosed);
    });

    it("makes an expanded pop-up compact", () => {
      const app = reading(
        actions.lookupSearchOpened(),
        actions.lookupSizeToggled(),
      );
      expect(selectReaderKeyBinding(app, exampleKeyPress("Escape"))).toEqual(
        bindAction(actions.lookupSizeToggled()),
      );
    });

    it("closes the pop-up from a field while a panel is open", () => {
      const app = reading(
        actions.lookupSearchOpened(),
        actions.readerPanelOpened("search"),
      );
      const press = exampleKeyPress("Escape", { focus: "formField" });
      expect(selectReaderKeyBinding(app, press)).toEqual(lookupClosed);
    });

    it("closes the lookup while the pop-up is closed, which drops a flashcard waiting for its word", () => {
      const press = exampleKeyPress("Escape");
      expect(selectReaderKeyBinding(reading(), press)).toEqual(lookupClosed);
    });

    it("leaves the key to an open panel while the pop-up is closed", () => {
      const press = exampleKeyPress("Escape");
      expect(selectReaderKeyBinding(withPanel(), press)).toBeNull();
    });
  });

  describe("on L", () => {
    it("looks up from the lookup cursor", () => {
      expect(selectReaderKeyBinding(reading(), exampleKeyPress("l"))).toEqual(
        lookedUp,
      );
    });

    it("looks up with Shift held", () => {
      const press = exampleKeyPress("L", { isShifted: true });
      expect(selectReaderKeyBinding(reading(), press)).toEqual(lookedUp);
    });

    it("leaves the key alone while a panel is open", () => {
      expect(
        selectReaderKeyBinding(withPanel(), exampleKeyPress("l")),
      ).toBeNull();
    });

    it("leaves the key alone while the flashcard editor is open", () => {
      const app = reading(startNew("f1"));
      expect(selectReaderKeyBinding(app, exampleKeyPress("l"))).toBeNull();
    });

    it("leaves a key typed into a field", () => {
      const press = exampleKeyPress("l", { focus: "formField" });
      expect(selectReaderKeyBinding(reading(), press)).toBeNull();
    });

    it("leaves a key pressed with Alt to the browser", () => {
      const press = exampleKeyPress("l", { hasAltKey: true });
      expect(selectReaderKeyBinding(reading(), press)).toBeNull();
    });
  });

  describe("on P", () => {
    const pressP = exampleKeyPress("p");

    it("plays the sentence of the word looked up", () => {
      const root = readingWith(alignedReaderCache, wordLookedUp);
      expect(selectReaderKeyBinding(root, pressP)).toEqual(
        bindCommand({ type: "playSentence", location: wordPlace }),
      );
    });

    it("plays the sentence being spoken when no word is looked up", () => {
      const root = readingWith(alignedReaderCache, speaking);
      expect(selectReaderKeyBinding(root, pressP)).toEqual(
        bindCommand({ type: "playSentence", location: spokenPlace }),
      );
    });

    it("does nothing without a current sentence", () => {
      expect(
        selectReaderKeyBinding(readingWith(alignedReaderCache), pressP),
      ).toBeNull();
    });

    it("does nothing for a book with no audio", () => {
      const root = readingWith(
        readerCacheWith({
          alignments: [translationAlignment()],
          isPaired: true,
        }),
        wordLookedUp,
      );
      expect(selectReaderKeyBinding(root, pressP)).toBeNull();
    });

    it("leaves the key alone while a panel is open", () => {
      const root = readingWith(
        alignedReaderCache,
        wordLookedUp,
        actions.readerPanelOpened("contents"),
      );
      expect(selectReaderKeyBinding(root, pressP)).toBeNull();
    });
  });

  describe("on T", () => {
    const pressT = exampleKeyPress("t");

    it("shows the translation of the looked-up word's sentence beside the word", () => {
      const root = readingWith(alignedReaderCache, wordLookedUp);
      expect(selectReaderKeyBinding(root, pressT)).toEqual(
        bindCommand({
          type: "showSentenceTranslation",
          location: wordPlace,
          anchor: rect,
        }),
      );
    });

    it("shows the translation of the spoken sentence at the foot of the window", () => {
      const root = readingWith(alignedReaderCache, speaking);
      expect(selectReaderKeyBinding(root, pressT)).toEqual(
        bindCommand({
          type: "showSentenceTranslation",
          location: spokenPlace,
          anchor: null,
        }),
      );
    });

    it("hides the translation shown", () => {
      const root = readingWith(alignedReaderCache, translationShown);
      expect(selectReaderKeyBinding(root, pressT)).toEqual(translationClosed);
    });

    it("does nothing without a current sentence", () => {
      expect(
        selectReaderKeyBinding(readingWith(alignedReaderCache), pressT),
      ).toBeNull();
    });

    it("does nothing while the book is not aligned with its translation", () => {
      const root = readingWith(
        readerCacheWith({ isPaired: true }),
        wordLookedUp,
      );
      expect(selectReaderKeyBinding(root, pressT)).toBeNull();
    });

    it("does nothing while the translation is shown with the text", () => {
      const root = readingWith(
        alignedReaderCache,
        actions.readerViewModeChosen("interlinear"),
        wordLookedUp,
      );
      expect(selectReaderKeyBinding(root, pressT)).toBeNull();
    });
  });

  describe("in the paged layout", () => {
    it.each(["ArrowRight", "PageDown", " "])(
      "turns to the next page on %j",
      (key) => {
        expect(selectReaderKeyBinding(reading(), exampleKeyPress(key))).toEqual(
          nextPage,
        );
      },
    );

    it.each(["ArrowLeft", "PageUp"])(
      "turns to the previous page on %j",
      (key) => {
        expect(selectReaderKeyBinding(reading(), exampleKeyPress(key))).toEqual(
          previousPage,
        );
      },
    );

    it("turns to the previous page on Shift+Space", () => {
      const press = exampleKeyPress(" ", { isShifted: true });
      expect(selectReaderKeyBinding(reading(), press)).toEqual(previousPage);
    });

    it("turns pages on the arrows while a control has focus", () => {
      const press = exampleKeyPress("ArrowRight", { focus: "control" });
      expect(selectReaderKeyBinding(reading(), press)).toEqual(nextPage);
    });

    it("leaves Space to a focused control, which it presses", () => {
      const press = exampleKeyPress(" ", { focus: "control" });
      expect(selectReaderKeyBinding(reading(), press)).toBeNull();
    });

    it("leaves the arrows alone while a panel is open", () => {
      expect(
        selectReaderKeyBinding(withPanel(), exampleKeyPress("ArrowRight")),
      ).toBeNull();
    });

    it("leaves the arrows to an open menu", () => {
      const press = exampleKeyPress("ArrowRight", { focus: "menu" });
      expect(selectReaderKeyBinding(reading(), press)).toBeNull();
    });

    it("leaves the arrows alone beneath Settings", () => {
      const app = reading(actions.settingsRequested());
      expect(
        selectReaderKeyBinding(app, exampleKeyPress("ArrowRight")),
      ).toBeNull();
    });

    it("leaves the arrows alone under a modal dialog", () => {
      const press = exampleKeyPress("ArrowRight", { isDialogOpen: true });
      expect(selectReaderKeyBinding(reading(), press)).toBeNull();
    });
  });

  describe("in the scrolling layout", () => {
    it.each(["ArrowRight", "PageDown", " "])(
      "leaves %j to the browser, which scrolls with it",
      (key) => {
        expect(
          selectReaderKeyBinding(scrolling(), exampleKeyPress(key)),
        ).toBeNull();
      },
    );
  });
});
