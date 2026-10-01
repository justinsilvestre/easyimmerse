import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fixtureDocument } from "../testSupport/fixtureDocument.ts";
import { DocumentReader } from "./DocumentReader.tsx";
import type { ReadingPosition } from "./readingPosition.ts";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

type DocumentReaderProps = ComponentProps<typeof DocumentReader>;

function renderReader(overrides: Partial<DocumentReaderProps> = {}) {
  render(
    <DocumentReader
      document={fixtureDocument}
      position={{ chapterIndex: 0, paragraphIndex: 0 }}
      onPositionChanged={() => {}}
      onWordHovered={() => {}}
      onWordActivated={() => {}}
      {...overrides}
    />,
  );
}

function renderReaderRecordingPositions(): ReadingPosition[] {
  const positions: ReadingPosition[] = [];
  renderReader({ onPositionChanged: (position) => positions.push(position) });
  return positions;
}

const getChapterHeading = () => screen.getByRole("heading", { level: 2 });

const clickButton = (name: string) =>
  fireEvent.click(screen.getByRole("button", { name }));

function searchFor(query: string, enterPresses: number) {
  const searchBox = screen.getByRole("searchbox", { name: "Search" });
  fireEvent.change(searchBox, { target: { value: query } });
  for (let press = 0; press < enterPresses; press++)
    fireEvent.keyDown(searchBox, { key: "Enter" });
}

describe("DocumentReader", () => {
  it("shows the chapter of the given position", () => {
    renderReader({ position: { chapterIndex: 1, paragraphIndex: 0 } });
    expect(getChapterHeading().textContent).toBe("Chapter Two");
  });

  describe("chapter navigation", () => {
    it("shows the next chapter when the next chapter button is clicked", () => {
      renderReader();
      clickButton("Next chapter");
      expect(getChapterHeading().textContent).toBe("Chapter Two");
    });

    it("reports the start of the next chapter as the position", () => {
      const positions = renderReaderRecordingPositions();
      clickButton("Next chapter");
      expect(positions).toEqual([{ chapterIndex: 1, paragraphIndex: 0 }]);
    });

    it("shows the chapter chosen in the table of contents", () => {
      renderReader();
      clickButton("Contents");
      clickButton("Chapter Two");
      expect(getChapterHeading().textContent).toBe("Chapter Two");
    });

    it("closes the table of contents once a chapter is chosen", () => {
      renderReader();
      clickButton("Contents");
      clickButton("Chapter Two");
      expect(
        screen.queryByRole("navigation", { name: "Table of contents" }),
      ).toBeNull();
    });

    it("moves focus to the heading of the chapter chosen in the table of contents", () => {
      renderReader();
      clickButton("Contents");
      clickButton("Chapter Two");
      expect(document.activeElement).toBe(getChapterHeading());
    });

    it("reports the start of the chapter chosen in the table of contents", () => {
      const positions = renderReaderRecordingPositions();
      clickButton("Contents");
      clickButton("Chapter Two");
      expect(positions).toEqual([{ chapterIndex: 1, paragraphIndex: 0 }]);
    });
  });

  describe("while scrolling", () => {
    it("reports the top-most visible paragraph as the position", () => {
      const observers = stubIntersectionObserver();
      const positions = renderReaderRecordingPositions();
      observers.reportVisible([2, 3]);
      expect(positions).toEqual([{ chapterIndex: 0, paragraphIndex: 2 }]);
    });

    it("does not report the position when the top-most visible paragraph is unchanged", () => {
      const observers = stubIntersectionObserver();
      const positions = renderReaderRecordingPositions();
      observers.reportVisible([0, 1]);
      expect(positions).toEqual([]);
    });
  });

  describe("word callbacks", () => {
    it("report a hovered word with its paragraph as context", () => {
      const hovered: unknown[] = [];
      renderReader({ onWordHovered: (event) => hovered.push(event) });
      fireEvent.mouseEnter(screen.getByRole("button", { name: "windowsill" }));
      expect(hovered).toEqual([
        {
          word: "windowsill",
          context: "The cat is sleeping on the windowsill.",
        },
      ]);
    });

    it("report a clicked word with its paragraph as context", () => {
      const activated: unknown[] = [];
      renderReader({ onWordActivated: (event) => activated.push(event) });
      clickButton("hungry");
      expect(activated).toEqual([
        { word: "hungry", context: "The dog wants to eat, and it is hungry." },
      ]);
    });
  });

  describe("font settings", () => {
    it("show the text in a serif font once Serif is chosen", () => {
      renderReader();
      clickButton("Serif");
      expect(screen.getByRole("article").className).toContain("font-serif");
    });

    it("show the text larger once Large is chosen", () => {
      renderReader();
      clickButton("Large");
      expect(screen.getByRole("article").className).toContain("text-2xl");
    });
  });

  describe("search", () => {
    it("shows the first match once Enter is pressed", () => {
      renderReader();
      searchFor("cat", 1);
      expect(screen.getByText("1 of 2")).toBeDefined();
    });

    it("highlights the paragraph of the shown match", () => {
      renderReader();
      searchFor("cat", 1);
      expect(document.querySelector("mark")?.textContent).toBe(
        "The cat is sleeping on the windowsill.",
      );
    });

    it("moves to the chapter of a match in a later chapter", () => {
      renderReader();
      searchFor("cat", 2);
      expect(getChapterHeading().textContent).toBe("Chapter Two");
    });

    it("reports the position of each shown match", () => {
      const positions = renderReaderRecordingPositions();
      searchFor("cat", 2);
      expect(positions).toEqual([
        { chapterIndex: 0, paragraphIndex: 0 },
        { chapterIndex: 1, paragraphIndex: 1 },
      ]);
    });

    it("returns to the first match after the last one", () => {
      renderReader();
      searchFor("cat", 3);
      expect(screen.getByText("1 of 2")).toBeDefined();
    });

    it("goes to the last match when stepping back before any match is shown", () => {
      renderReader();
      searchFor("cat", 0);
      clickButton("Previous match");
      expect(screen.getByText("2 of 2")).toBeDefined();
    });

    it("stops highlighting once the query changes", () => {
      renderReader();
      searchFor("cat", 1);
      searchFor("dog", 0);
      expect(document.querySelector("mark")).toBeNull();
    });
  });
});

/** Replaces IntersectionObserver with a fake that reports the given paragraphs as visible on demand. */
function stubIntersectionObserver() {
  const instances: FakeIntersectionObserver[] = [];
  class FakeIntersectionObserver {
    readonly targets: Element[] = [];
    constructor(readonly callback: IntersectionObserverCallback) {
      instances.push(this);
    }
    observe(target: Element) {
      this.targets.push(target);
    }
    disconnect() {}
  }
  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
  return {
    reportVisible(paragraphIndices: number[]) {
      for (const observer of instances) {
        const entries = observer.targets.map((target) => {
          const isVisible = paragraphIndices.includes(
            Number(target.getAttribute("data-paragraph-index")),
          );
          return {
            target,
            isIntersecting: isVisible,
            intersectionRatio: isVisible ? 1 : 0,
          } as unknown as IntersectionObserverEntry;
        });
        observer.callback(entries, observer as unknown as IntersectionObserver);
      }
    },
  };
}
