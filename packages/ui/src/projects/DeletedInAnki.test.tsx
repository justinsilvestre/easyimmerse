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

function renderList(
  words: readonly string[] = ["Katze", "Hund"],
  markCount = 0,
) {
  const calls: string[] = [];
  render(
    <DeletedInAnki
      deletions={words.map((word, index) => deletion(`f${index}`, word))}
      markCount={markCount}
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

  it("tells how to delete the notes in Anki", () => {
    renderList();
    expect(
      screen.getByText(
        "Paste the search into Anki's browser to find their notes, delete them there, then mark them as done.",
      ),
    ).toBeDefined();
  });

  it("tells that the next export marking its cards marks them for deletion", () => {
    renderList(["Katze", "Hund"], 2);
    expect(
      screen.getByText(
        /Otherwise, the next export that marks its cards as exported marks them for deletion\./,
      ),
    ).toBeDefined();
  });

  it("tells how many of them the next export marks when only some can be", () => {
    renderList(["Katze", "Hund"], 1);
    expect(screen.getByText(/marks 1 of them for deletion\./)).toBeDefined();
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
