import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DeletedInAnki } from "./DeletedInAnki.tsx";

afterEach(cleanup);

const deletion = (flashcardId: string, word: string) => ({
  flashcard_id: flashcardId,
  word,
  requested_at_ms: 1,
  reached_by_package: true,
});

function renderList(words: readonly string[] = ["Katze", "Hund"]) {
  const calls: string[] = [];
  render(
    <DeletedInAnki
      deletions={words.map((word, index) => deletion(`f${index}`, word))}
      onCopyAnkiSearch={() => calls.push("copy")}
      onMarkDone={() => calls.push("done")}
    />,
  );
  return calls;
}

describe("DeletedInAnki", () => {
  it("counts the deleted flashcards", () => {
    renderList();
    expect(
      screen.getByRole("heading", {
        name: "2 deleted flashcards to delete in Anki",
      }),
    ).toBeDefined();
  });

  it("lists the deleted flashcards by word", () => {
    renderList();
    expect(
      screen.getAllByRole("listitem").map((item) => item.textContent),
    ).toEqual(["Katze", "Hund"]);
  });

  it("names a flashcard deleted without a word", () => {
    renderList([""]);
    expect(screen.getByText("A flashcard without a word")).toBeDefined();
  });

  it("copies the Anki search", () => {
    const calls = renderList();
    fireEvent.click(screen.getByRole("button", { name: "Copy Anki search" }));
    expect(calls).toEqual(["copy"]);
  });

  it("marks the deleted flashcards as done", () => {
    const calls = renderList();
    fireEvent.click(screen.getByRole("button", { name: "Mark as done" }));
    expect(calls).toEqual(["done"]);
  });
});
