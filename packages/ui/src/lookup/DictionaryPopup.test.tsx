import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DictionaryPopup } from "./DictionaryPopup.tsx";
import { exampleEntries } from "./exampleLookup.ts";

afterEach(cleanup);

function renderPopup(
  onCreateFlashcard: (term: string, entryIndex: number | null) => void,
) {
  render(
    <DictionaryPopup
      state={{ kind: "found", term: "fressen", entries: exampleEntries }}
      mode="hover"
      onSearch={() => undefined}
      onCreateFlashcard={onCreateFlashcard}
      onClose={() => undefined}
      onSetUpDictionary={() => undefined}
    />,
  );
}

describe("DictionaryPopup", () => {
  it("creates a flashcard from every entry with the header button", () => {
    const created: [string, number | null][] = [];
    renderPopup((term, index) => created.push([term, index]));
    fireEvent.click(screen.getByRole("button", { name: "Flashcard" }));
    expect(created).toEqual([["fressen", null]]);
  });

  it("creates a flashcard from one entry with that entry's button", () => {
    const created: [string, number | null][] = [];
    renderPopup((term, index) => created.push([term, index]));
    fireEvent.click(
      screen.getAllByRole("button", {
        name: "Flashcard from this entry",
      })[1] as HTMLElement,
    );
    expect(created).toEqual([["fressen", 1]]);
  });

  it("creates a flashcard for a word clicked inside a definition", () => {
    const created: [string, number | null][] = [];
    renderPopup((term, index) => created.push([term, index]));
    fireEvent.click(screen.getByRole("button", { name: "devour" }));
    expect(created).toEqual([["devour", null]]);
  });
});
