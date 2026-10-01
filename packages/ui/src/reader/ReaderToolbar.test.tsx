import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { ReaderToolbar } from "./ReaderToolbar.tsx";
import { defaultReaderSettings } from "./readerSettings.ts";

afterEach(cleanup);

type ReaderToolbarProps = ComponentProps<typeof ReaderToolbar>;

function renderToolbar(overrides: Partial<ReaderToolbarProps> = {}) {
  const props: ReaderToolbarProps = {
    chapterIndex: 1,
    chapterCount: 5,
    onChapterStepped: () => {},
    isTableOfContentsOpen: false,
    onTableOfContentsToggled: () => {},
    settings: defaultReaderSettings,
    onSettingsChanged: () => {},
    searchQuery: "",
    searchMatchIndex: null,
    searchMatchCount: 0,
    onSearchQueryChanged: () => {},
    onSearchStepped: () => {},
    ...overrides,
  };
  render(<ReaderToolbar {...props} />);
}

const getSearchBox = () => screen.getByRole("searchbox", { name: "Search" });

describe("ReaderToolbar", () => {
  describe("chapter controls", () => {
    it("show the reading progress", () => {
      renderToolbar();
      expect(screen.getByText("Chapter 2 of 5")).toBeDefined();
    });

    it("disable the previous chapter button on the first chapter", () => {
      renderToolbar({ chapterIndex: 0 });
      expect(
        screen.getByRole("button", { name: "Previous chapter" }),
      ).toHaveProperty("disabled", true);
    });

    it("disable the next chapter button on the last chapter", () => {
      renderToolbar({ chapterIndex: 4 });
      expect(
        screen.getByRole("button", { name: "Next chapter" }),
      ).toHaveProperty("disabled", true);
    });

    it("report a step forward when the next chapter button is clicked", () => {
      const steps: number[] = [];
      renderToolbar({ onChapterStepped: (step) => steps.push(step) });
      fireEvent.click(screen.getByRole("button", { name: "Next chapter" }));
      expect(steps).toEqual([1]);
    });

    it("show whether the table of contents is open", () => {
      renderToolbar({ isTableOfContentsOpen: true });
      expect(
        screen
          .getByRole("button", { name: "Contents" })
          .getAttribute("aria-expanded"),
      ).toBe("true");
    });
  });

  describe("font controls", () => {
    it("mark the current font size as pressed", () => {
      renderToolbar();
      expect(
        screen
          .getByRole("button", { name: "Medium" })
          .getAttribute("aria-pressed"),
      ).toBe("true");
    });

    it("report a new font size", () => {
      const changes: unknown[] = [];
      renderToolbar({ onSettingsChanged: (s) => changes.push(s) });
      fireEvent.click(screen.getByRole("button", { name: "Large" }));
      expect(changes).toEqual([
        { ...defaultReaderSettings, fontSize: "large" },
      ]);
    });

    it("report a new font family", () => {
      const changes: unknown[] = [];
      renderToolbar({ onSettingsChanged: (s) => changes.push(s) });
      fireEvent.click(screen.getByRole("button", { name: "Serif" }));
      expect(changes).toEqual([
        { ...defaultReaderSettings, fontFamily: "serif" },
      ]);
    });
  });

  describe("search box", () => {
    it("reports the typed query", () => {
      const queries: string[] = [];
      renderToolbar({ onSearchQueryChanged: (q) => queries.push(q) });
      fireEvent.change(getSearchBox(), { target: { value: "cat" } });
      expect(queries).toEqual(["cat"]);
    });

    it("reports a step forward when Enter is pressed", () => {
      const steps: number[] = [];
      renderToolbar({
        searchQuery: "cat",
        searchMatchCount: 2,
        onSearchStepped: (step) => steps.push(step),
      });
      fireEvent.keyDown(getSearchBox(), { key: "Enter" });
      expect(steps).toEqual([1]);
    });

    it("reports a step back when Shift and Enter are pressed", () => {
      const steps: number[] = [];
      renderToolbar({
        searchQuery: "cat",
        searchMatchCount: 2,
        onSearchStepped: (step) => steps.push(step),
      });
      fireEvent.keyDown(getSearchBox(), { key: "Enter", shiftKey: true });
      expect(steps).toEqual([-1]);
    });

    it("shows the number of matches before one is chosen", () => {
      renderToolbar({ searchQuery: "cat", searchMatchCount: 3 });
      expect(screen.getByText("3 matches")).toBeDefined();
    });

    it("shows which match is shown", () => {
      renderToolbar({
        searchQuery: "cat",
        searchMatchIndex: 0,
        searchMatchCount: 3,
      });
      expect(screen.getByText("1 of 3")).toBeDefined();
    });

    it("says when nothing matches", () => {
      renderToolbar({ searchQuery: "elephant" });
      expect(screen.getByText("No matches")).toBeDefined();
    });
  });
});
