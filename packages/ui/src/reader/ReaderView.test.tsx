import {
  actions,
  initialReaderScreen,
  type ReaderScreenState,
} from "@easyimmerse/state";
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { exampleShortBook } from "./exampleDocuments.ts";
import { ReaderView, type ReaderViewAction } from "./ReaderView.tsx";
import {
  defaultReaderPreferences,
  type ReaderPreferences,
} from "./readerPreferences.ts";
import { type ReaderLocation, startOfBook } from "./readingProgress.ts";

afterEach(cleanup);

const ignore = () => undefined;

/**
 * Renders the reader on the short example book, and returns the actions it dispatches.
 * The store it renders in only serves the keys, which `ReaderScreen`'s tests cover.
 */
function renderReader(
  overrides: {
    location?: ReaderLocation;
    reader?: Partial<ReaderScreenState>;
    onPreferencesChange?: (preferences: ReaderPreferences) => void;
  } = {},
) {
  const dispatched: ReaderViewAction[] = [];
  renderWithAppStore(
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
        layout: "scroll",
      }}
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
});
