import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DictionaryPopup } from "./DictionaryPopup.tsx";
import {
  exampleInflectedResult,
  exampleKanjiResult,
} from "./exampleJapaneseLookup.ts";
import { exampleResults } from "./exampleLookup.ts";
import type { LookupState } from "./lookupState.ts";

afterEach(cleanup);

function renderPopup(
  onCreateFlashcard: (term: string, entryIndex: number | null) => void,
) {
  render(
    <DictionaryPopup
      state={{ kind: "found", term: "fressen", results: exampleResults }}
      resolveMediaUrl={() => null}
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

function renderState(state: LookupState) {
  render(
    <DictionaryPopup
      state={state}
      mode="hover"
      resolveMediaUrl={() => null}
      onSearch={() => undefined}
      onCreateFlashcard={() => undefined}
      onClose={() => undefined}
      onSetUpDictionary={() => undefined}
    />,
  );
}

describe("DictionaryPopup states", () => {
  it("says what it is looking up while loading", () => {
    renderState({ kind: "loading", term: "fressen" });
    expect(screen.getByText("Looking up fressen…")).toBeDefined();
  });

  it("says when nothing was found", () => {
    renderState({ kind: "notFound", term: "Hundi" });
    expect(screen.getByText("No entry for “Hundi”.")).toBeDefined();
  });

  it("offers to add a dictionary when none is set up", () => {
    renderState({ kind: "noDictionary", language: "de" });
    expect(
      screen.getByRole("button", { name: "Add a dictionary" }),
    ).toBeDefined();
  });

  it("shows kanji results after the term results", () => {
    renderState({
      kind: "found",
      term: "食べなかった",
      results: [exampleInflectedResult],
      kanji: [exampleKanjiResult],
    });
    expect(screen.getByRole("article", { name: "Kanji 食" })).toBeDefined();
  });
});
