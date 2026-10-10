import { describe, expect, it } from "vitest";
import type { AppAction } from "../app/appAction.ts";
import { actions } from "../app/appAction.ts";
import { stateAfter } from "../app/stateAfter.ts";
import { startNew } from "../flashcards/flashcardsTestSupport.ts";
import { exampleKeyPress } from "./exampleKeyPress.ts";
import { bindAction, bindCommand } from "./keyBinding.ts";
import { selectReaderKeyBinding } from "./selectReaderKeyBinding.ts";

const openBook = actions.openMediaFileRequested("p1", "b1");
/** The reader on a book just opened, in the paged layout, after the actions given. */
const reading = (...done: AppAction[]) => stateAfter(openBook, ...done);
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
        focus: "textField",
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
      const press = exampleKeyPress("Escape", { focus: "textField" });
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
      const press = exampleKeyPress("l", { focus: "textField" });
      expect(selectReaderKeyBinding(reading(), press)).toBeNull();
    });

    it("leaves a key pressed with Alt to the browser", () => {
      const press = exampleKeyPress("l", { hasAltKey: true });
      expect(selectReaderKeyBinding(reading(), press)).toBeNull();
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
