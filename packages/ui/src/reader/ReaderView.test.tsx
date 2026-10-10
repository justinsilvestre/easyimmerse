import {
  actions,
  initialReaderScreen,
  type ReaderScreenState,
} from "@easyimmerse/state";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { exampleShortBook } from "./exampleDocuments.ts";
import { ReaderView, type ReaderViewAction } from "./ReaderView.tsx";
import {
  defaultReaderPreferences,
  type ReaderPreferences,
} from "./readerPreferences.ts";
import { type ReaderLocation, startOfBook } from "./readingProgress.ts";

afterEach(cleanup);

const ignore = () => undefined;

/** Renders the reader on the short example book, and returns the actions it dispatches. */
function renderReader(
  overrides: {
    location?: ReaderLocation;
    reader?: Partial<ReaderScreenState>;
    layout?: ReaderPreferences["layout"];
    onPreferencesChange?: (preferences: ReaderPreferences) => void;
    sidePanel?: ReactNode;
  } = {},
) {
  const dispatched: ReaderViewAction[] = [];
  render(
    <ReaderView
      mediaFileId="b1"
      document={exampleShortBook}
      location={overrides.location ?? startOfBook}
      reader={{ ...initialReaderScreen, ...overrides.reader }}
      dispatch={(action) => dispatched.push(action)}
      title="Sample Book"
      projectName="English reading"
      language="en"
      preferences={{
        ...defaultReaderPreferences,
        layout: overrides.layout ?? "scroll",
      }}
      sidePanel={overrides.sidePanel}
      callbacks={{
        onBack: ignore,
        onLookup: ignore,
        onWordClick: ignore,
        onWordDoubleClick: ignore,
        onWordHover: ignore,
        onWordHold: ignore,
        onDismissLookup: ignore,
        onPreferencesChange: overrides.onPreferencesChange ?? ignore,
      }}
    />,
  );
  return dispatched;
}

const jumps = (dispatched: ReaderViewAction[]) =>
  dispatched.filter((action) => action.type === "readerJumped");

const chapterTwo = { chapterIndex: 1, paragraphIndex: 0, offset: 0 };

describe("ReaderView", () => {
  it("shows the chapter at the location", () => {
    renderReader({ location: chapterTwo });
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(
      "Chapter Two",
    );
  });

  it("asks to jump to the start of the chapter chosen from the contents", () => {
    const dispatched = renderReader({ reader: { panel: "contents" } });
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: /Chapter Two/,
      }),
    );
    expect(dispatched).toContainEqual(actions.readerJumped("b1", chapterTwo));
  });

  it("counts the search results across chapters", () => {
    renderReader({
      reader: {
        panel: "search",
        search: { query: "cat", activeMatchIndex: null },
      },
    });
    expect(screen.getByText("2 results")).toBeTruthy();
  });

  it("reports a change of theme from the appearance panel", () => {
    const changes: ReaderPreferences[] = [];
    renderReader({
      reader: { panel: "appearance" },
      onPreferencesChange: (change) => changes.push(change),
    });
    fireEvent.click(screen.getByRole("radio", { name: "Sepia" }));
    expect(changes.map((change) => change.theme)).toEqual(["sepia"]);
  });

  // Without a layout engine no word is found under the pointer, so a click counts as a tap beside the words.
  it("asks to show or hide the toolbar on a tap beside the words", () => {
    const dispatched = renderReader();
    fireEvent.click(screen.getByRole("main"));
    expect(dispatched).toContainEqual(actions.readerChromeToggled());
  });

  it("asks to open the search panel on Ctrl+F", () => {
    const dispatched = renderReader();
    fireEvent.keyDown(document.body, { key: "f", ctrlKey: true });
    expect(dispatched).toContainEqual(actions.readerPanelOpened("search"));
  });

  describe("when the toolbar is hidden", () => {
    const hidden = { reader: { isChromeVisible: false } };

    it("keeps the back button reachable by keyboard", () => {
      renderReader(hidden);
      const back = screen.getByRole("button", {
        name: "Back to English reading",
      });
      expect(back.closest("[inert]")).toBeNull();
    });

    it("keeps the progress slider reachable by keyboard", () => {
      renderReader(hidden);
      const slider = screen.getByRole("slider");
      expect(slider.closest("[inert]")).toBeNull();
    });
  });

  describe("in the scrolling layout", () => {
    it("gives the text the keyboard on opening, so that the scrolling keys work at once", () => {
      renderReader();
      expect(document.activeElement).toBe(
        screen.getByRole("main").firstElementChild,
      );
    });
  });

  describe("in the paged layout", () => {
    // Without a layout engine every chapter fills one page, so turning the page moves to the next chapter.
    it("asks to jump to the next chapter with the right arrow key", () => {
      const dispatched = renderReader({ layout: "pages" });
      fireEvent.keyDown(document.body, { key: "ArrowRight" });
      expect(dispatched).toContainEqual(actions.readerJumped("b1", chapterTwo));
    });

    it("leaves the arrow keys alone while a side panel is open", () => {
      const dispatched = renderReader({
        layout: "pages",
        sidePanel: <p>Flashcard</p>,
      });
      fireEvent.keyDown(document.body, { key: "ArrowRight" });
      expect(jumps(dispatched)).toEqual([]);
    });

    it("leaves Space to a focused button rather than turning the page", () => {
      const dispatched = renderReader({ layout: "pages" });
      const button = screen.getByRole("button", { name: "Contents" });
      button.focus();
      fireEvent.keyDown(button, { key: " " });
      expect(jumps(dispatched)).toEqual([]);
    });
  });
});
