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

const wordPlace = { chapterIndex: 0, paragraphIndex: 0, offset: 4 };
/** The mouse pointing at a word of the book's first sentence. */
const wordPointed = actions.lookupCursorMoved(
  chosenTextWord(wordPlace),
  "mouse",
);
const spokenPlace = { chapterIndex: 0, paragraphIndex: 1, offset: 0 };
/** The audio playing in its one segment. */
const speaking = actions.playerTimeChanged(spokenSegment.start_ms / 1000);

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

  describe("on R", () => {
    const pressR = exampleKeyPress("r");

    it("plays the sentence of the word pointed at", () => {
      const root = readingWith(alignedReaderCache, wordPointed);
      expect(selectReaderKeyBinding(root, pressR)).toEqual(
        bindCommand({ type: "playSentence", location: wordPlace }),
      );
    });

    it("plays the sentence being spoken when no word is pointed at", () => {
      const root = readingWith(alignedReaderCache, speaking);
      expect(selectReaderKeyBinding(root, pressR)).toEqual(
        bindCommand({ type: "playSentence", location: spokenPlace }),
      );
    });

    it("does nothing without a current sentence", () => {
      expect(
        selectReaderKeyBinding(readingWith(alignedReaderCache), pressR),
      ).toBeNull();
    });

    it("does nothing for a book with no audio", () => {
      const root = readingWith(
        readerCacheWith({
          alignments: [translationAlignment()],
          isPaired: true,
        }),
        wordPointed,
      );
      expect(selectReaderKeyBinding(root, pressR)).toBeNull();
    });

    it("leaves the key alone while a panel is open", () => {
      const root = readingWith(
        alignedReaderCache,
        wordPointed,
        actions.readerPanelOpened("contents"),
      );
      expect(selectReaderKeyBinding(root, pressR)).toBeNull();
    });
  });

  describe("on T", () => {
    const pressT = exampleKeyPress("t");
    const toggleTranslation = bindCommand({
      type: "toggleSentenceTranslation",
    });

    it("shows or hides the translation of the pointed word's sentence", () => {
      const root = readingWith(alignedReaderCache, wordPointed);
      expect(selectReaderKeyBinding(root, pressT)).toEqual(toggleTranslation);
    });

    it("shows or hides the translation of the spoken sentence", () => {
      const root = readingWith(alignedReaderCache, speaking);
      expect(selectReaderKeyBinding(root, pressT)).toEqual(toggleTranslation);
    });

    it("shows or hides the translation of the sentence of the word the pop-up shows", () => {
      const root = readingWith(
        alignedReaderCache,
        actions.lookupWordClicked(chosenTextWord(wordPlace), "touch"),
      );
      expect(selectReaderKeyBinding(root, pressT)).toEqual(toggleTranslation);
    });

    it("does nothing without a current sentence", () => {
      expect(
        selectReaderKeyBinding(readingWith(alignedReaderCache), pressT),
      ).toBeNull();
    });

    it("does nothing while the book is not aligned with its translation", () => {
      const root = readingWith(
        readerCacheWith({ isPaired: true }),
        wordPointed,
      );
      expect(selectReaderKeyBinding(root, pressT)).toBeNull();
    });

    it("does nothing while the translation is shown with the text", () => {
      const root = readingWith(
        alignedReaderCache,
        actions.readerViewModeChosen("interlinear"),
        wordPointed,
      );
      expect(selectReaderKeyBinding(root, pressT)).toBeNull();
    });
  });

  describe("on C and E", () => {
    it("saves a flashcard from the lookup cursor on C", () => {
      expect(selectReaderKeyBinding(reading(), exampleKeyPress("c"))).toEqual(
        bindCommand({ type: "startFlashcardAtCursor", destination: "save" }),
      );
    });

    it("opens a flashcard from the lookup cursor in the editor on E", () => {
      expect(selectReaderKeyBinding(reading(), exampleKeyPress("e"))).toEqual(
        bindCommand({ type: "startFlashcardAtCursor", destination: "editor" }),
      );
    });

    it("leaves C alone while the flashcard editor is open", () => {
      const app = reading(startNew("f1"));
      expect(selectReaderKeyBinding(app, exampleKeyPress("c"))).toBeNull();
    });

    it("leaves E alone while the flashcard editor is open", () => {
      const app = reading(startNew("f1"));
      expect(selectReaderKeyBinding(app, exampleKeyPress("e"))).toBeNull();
    });

    it("leaves C alone while a panel is open", () => {
      expect(
        selectReaderKeyBinding(withPanel(), exampleKeyPress("c")),
      ).toBeNull();
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
  describe("while the keyboard has placed the lookup cursor in the text", () => {
    const keyboardCursor = actions.lookupCursorMoved(
      chosenTextWord(wordPlace),
      "keyboard",
    );
    const withCursor = (...done: AppAction[]) =>
      reading(keyboardCursor, ...done);
    const stepCursor = (
      direction: "forward" | "backward",
      unit: "word" | "character" | "sentence",
    ) => bindCommand({ type: "stepCursor", step: { direction, unit } });

    it("moves the cursor forward by a word on Right", () => {
      expect(
        selectReaderKeyBinding(withCursor(), exampleKeyPress("ArrowRight")),
      ).toEqual(stepCursor("forward", "word"));
    });

    it("moves the cursor backward by a word on Left", () => {
      expect(
        selectReaderKeyBinding(withCursor(), exampleKeyPress("ArrowLeft")),
      ).toEqual(stepCursor("backward", "word"));
    });

    it("moves the cursor by a character on Shift+Right", () => {
      const press = exampleKeyPress("ArrowRight", { isShifted: true });
      expect(selectReaderKeyBinding(withCursor(), press)).toEqual(
        stepCursor("forward", "character"),
      );
    });

    it("moves the cursor to the next sentence on Down", () => {
      expect(
        selectReaderKeyBinding(withCursor(), exampleKeyPress("ArrowDown")),
      ).toEqual(stepCursor("forward", "sentence"));
    });

    it("moves the cursor to the previous sentence on Up", () => {
      expect(
        selectReaderKeyBinding(withCursor(), exampleKeyPress("ArrowUp")),
      ).toEqual(stepCursor("backward", "sentence"));
    });

    it("moves the cursor rather than turning the page in the paged layout", () => {
      const app = reading(keyboardCursor);
      expect(
        selectReaderKeyBinding(app, exampleKeyPress("ArrowRight")),
      ).not.toEqual(nextPage);
    });

    it("looks up the cursor's word on Enter", () => {
      expect(
        selectReaderKeyBinding(withCursor(), exampleKeyPress("Enter")),
      ).toEqual(lookedUp);
    });

    it("looks up the cursor's word on Space", () => {
      expect(
        selectReaderKeyBinding(withCursor(), exampleKeyPress(" ")),
      ).toEqual(lookedUp);
    });

    it("saves a flashcard from the cursor's word on Shift+Enter", () => {
      const press = exampleKeyPress("Enter", { isShifted: true });
      expect(selectReaderKeyBinding(withCursor(), press)).toEqual(
        bindCommand({ type: "startFlashcardAtCursor", destination: "save" }),
      );
    });

    it("takes the cursor away on Escape", () => {
      expect(
        selectReaderKeyBinding(withCursor(), exampleKeyPress("Escape")),
      ).toEqual(bindAction(actions.lookupCursorLeft("keyboard")));
    });

    it("closes the pop-up on Escape before taking the cursor away", () => {
      const app = withCursor(actions.lookupCursorLookedUp());
      expect(selectReaderKeyBinding(app, exampleKeyPress("Escape"))).toEqual(
        lookupClosed,
      );
    });

    it("turns pages with the arrows again once Escape has taken the cursor away", () => {
      const app = withCursor(actions.lookupCursorLeft("keyboard"));
      expect(
        selectReaderKeyBinding(app, exampleKeyPress("ArrowRight")),
      ).toEqual(nextPage);
    });

    it("turns pages with the arrows while the mouse placed the cursor", () => {
      const app = reading(wordPointed);
      expect(
        selectReaderKeyBinding(app, exampleKeyPress("ArrowRight")),
      ).toEqual(nextPage);
    });

    it("leaves the arrows alone while a panel is open", () => {
      const app = withCursor(actions.readerPanelOpened("contents"));
      expect(
        selectReaderKeyBinding(app, exampleKeyPress("ArrowRight")),
      ).toBeNull();
    });
  });
});
