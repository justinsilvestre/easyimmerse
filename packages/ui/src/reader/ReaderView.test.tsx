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
import { ReaderView } from "./ReaderView.tsx";
import {
  defaultReaderPreferences,
  type ReaderPreferences,
} from "./readerPreferences.ts";
import type { ReaderLocation } from "./readingProgress.ts";

afterEach(cleanup);

const ignore = () => undefined;

function renderReader(
  overrides: {
    initialLocation?: ReaderLocation;
    layout?: ReaderPreferences["layout"];
    onLocationChange?: (location: ReaderLocation) => unknown;
    onPreferencesChange?: (preferences: ReaderPreferences) => void;
    sidePanel?: ReactNode;
  } = {},
) {
  render(
    <ReaderView
      document={exampleShortBook}
      title="Sample Book"
      language="en"
      preferences={{
        ...defaultReaderPreferences,
        layout: overrides.layout ?? "scroll",
      }}
      initialLocation={overrides.initialLocation}
      sidePanel={overrides.sidePanel}
      callbacks={{
        onBack: ignore,
        onLookup: ignore,
        onWordHover: ignore,
        onWordClick: ignore,
        onDismissLookup: ignore,
        onLocationChange: overrides.onLocationChange ?? ignore,
        onPreferencesChange: overrides.onPreferencesChange ?? ignore,
      }}
    />,
  );
}

describe("ReaderView", () => {
  it("shows the chapter at the initial location", () => {
    renderReader({
      initialLocation: { chapterIndex: 1, paragraphIndex: 0, offset: 0 },
    });
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(
      "Chapter Two",
    );
  });

  it("opens a place saved past the end of the book in the last chapter", () => {
    renderReader({
      initialLocation: { chapterIndex: 9, paragraphIndex: 0, offset: 0 },
    });
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(
      "Chapter Two",
    );
  });

  it("moves to the chapter chosen from the contents", () => {
    renderReader();
    fireEvent.click(screen.getByRole("button", { name: "Contents" }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: /Chapter Two/,
      }),
    );
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(
      "Chapter Two",
    );
  });

  it("moves on when the location callback returns a value, as a dispatch does", () => {
    renderReader({ onLocationChange: (location) => ({ type: "x", location }) });
    fireEvent.click(screen.getByRole("button", { name: "Contents" }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: /Chapter Two/,
      }),
    );
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(
      "Chapter Two",
    );
  });

  it("counts the search results across chapters", () => {
    renderReader();
    fireEvent.click(screen.getByRole("button", { name: "Search the book" }));
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "cat" },
    });
    expect(screen.getByText("2 results")).toBeTruthy();
  });

  it("reports a change of theme from the appearance panel", () => {
    const changes: ReaderPreferences[] = [];
    renderReader({ onPreferencesChange: (change) => changes.push(change) });
    fireEvent.click(screen.getByRole("button", { name: "Appearance" }));
    fireEvent.click(screen.getByRole("radio", { name: "Sepia" }));
    expect(changes.map((change) => change.theme)).toEqual(["sepia"]);
  });

  describe("when the toolbar is hidden", () => {
    // Without a layout engine no word is found under the pointer, so a click counts as a tap beside the words.
    function hideToolbar() {
      fireEvent.click(screen.getByRole("main"));
    }

    it("keeps the back button reachable by keyboard", () => {
      renderReader();
      hideToolbar();
      const back = screen.getByRole("button", { name: "Project" });
      expect(back.closest("[inert]")).toBeNull();
    });

    it("keeps the progress slider reachable by keyboard", () => {
      renderReader();
      hideToolbar();
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
    it("turns the page with the right arrow key", () => {
      renderReader({ layout: "pages" });
      fireEvent.keyDown(document.body, { key: "ArrowRight" });
      expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(
        "Chapter Two",
      );
    });

    it("leaves the arrow keys alone while a side panel is open", () => {
      renderReader({ layout: "pages", sidePanel: <p>Flashcard</p> });
      fireEvent.keyDown(document.body, { key: "ArrowRight" });
      expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(
        "Chapter One",
      );
    });

    it("leaves Space to a focused button rather than turning the page", () => {
      renderReader({ layout: "pages" });
      const button = screen.getByRole("button", { name: "Contents" });
      button.focus();
      fireEvent.keyDown(button, { key: " " });
      expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(
        "Chapter One",
      );
    });
  });

  describe("when Ctrl+F is pressed", () => {
    it("puts the cursor in the search field", () => {
      renderReader();
      fireEvent.keyDown(document.body, { key: "f", ctrlKey: true });
      expect(document.activeElement).toBe(screen.getByRole("searchbox"));
    });

    it("keeps the search open when it is already open", () => {
      renderReader();
      fireEvent.keyDown(document.body, { key: "f", ctrlKey: true });
      fireEvent.keyDown(document.body, { key: "f", ctrlKey: true });
      expect(screen.queryByRole("searchbox")).not.toBeNull();
    });
  });
});
