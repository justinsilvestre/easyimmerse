import type { Chapter } from "@easyimmerse/types";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ReaderTableOfContents } from "./ReaderTableOfContents.tsx";

afterEach(cleanup);

const chapters: Chapter[] = [
  { title: "Arrival", paragraphs: ["One."] },
  { title: null, paragraphs: ["Two."] },
];

describe("ReaderTableOfContents", () => {
  it("lists the chapter titles", () => {
    render(
      <ReaderTableOfContents
        chapters={chapters}
        currentIndex={0}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "Arrival" })).toBeDefined();
  });

  it("names an untitled chapter by its number", () => {
    render(
      <ReaderTableOfContents
        chapters={chapters}
        currentIndex={0}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "Chapter 2" })).toBeDefined();
  });

  it("marks the current chapter", () => {
    render(
      <ReaderTableOfContents
        chapters={chapters}
        currentIndex={1}
        onSelect={() => {}}
      />,
    );
    expect(
      screen
        .getByRole("button", { name: "Chapter 2" })
        .getAttribute("aria-current"),
    ).toBe("true");
  });

  it("reports the index of the selected chapter", () => {
    const selected: number[] = [];
    render(
      <ReaderTableOfContents
        chapters={chapters}
        currentIndex={0}
        onSelect={(index) => selected.push(index)}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Chapter 2" }));
    expect(selected).toEqual([1]);
  });
});
