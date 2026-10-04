import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
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
    onPreferencesChange?: (preferences: ReaderPreferences) => void;
  } = {},
) {
  render(
    <ReaderView
      document={exampleShortBook}
      title="Sample Book"
      language="en"
      preferences={{ ...defaultReaderPreferences, layout: "scroll" }}
      initialLocation={overrides.initialLocation}
      callbacks={{
        onBack: ignore,
        onLookup: ignore,
        onWordHover: ignore,
        onWordClick: ignore,
        onDismissLookup: ignore,
        onLocationChange: ignore,
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
});
