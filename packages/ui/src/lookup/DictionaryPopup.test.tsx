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

type PopupHandlers = {
  onSearch?: (term: string) => void;
  onCreateFlashcard?: (entryIndex: number | null) => void;
  onClose?: () => void;
};

function renderPopup({
  onSearch = () => undefined,
  onCreateFlashcard = () => undefined,
  onClose = () => undefined,
}: PopupHandlers) {
  render(
    <>
      <button type="button" data-lookup-trigger>
        Hund
      </button>
      <DictionaryPopup
        state={{ kind: "found", term: "fressen", results: exampleResults }}
        resolveMediaUrl={() => null}
        mode="hover"
        onSearch={onSearch}
        onCreateFlashcard={onCreateFlashcard}
        onClose={onClose}
        onSetUpDictionary={() => undefined}
      />
    </>,
  );
}

describe("DictionaryPopup", () => {
  it("creates a flashcard from every entry with the header button", () => {
    const created: (number | null)[] = [];
    renderPopup({ onCreateFlashcard: (index) => created.push(index) });
    fireEvent.click(screen.getByRole("button", { name: "Flashcard" }));
    expect(created).toEqual([null]);
  });

  it("creates a flashcard from one entry with that entry's button", () => {
    const created: (number | null)[] = [];
    renderPopup({ onCreateFlashcard: (index) => created.push(index) });
    fireEvent.click(
      screen.getAllByRole("button", {
        name: "Flashcard from this entry",
      })[1] as HTMLElement,
    );
    expect(created).toEqual([1]);
  });

  it("looks up a word clicked inside a definition", () => {
    const searched: string[] = [];
    renderPopup({ onSearch: (term) => searched.push(term) });
    fireEvent.click(screen.getByRole("button", { name: "devour" }));
    expect(searched).toEqual(["devour"]);
  });
});

describe("DictionaryPopup dismissal", () => {
  it("closes on Escape", () => {
    let closeCount = 0;
    renderPopup({ onClose: () => (closeCount += 1) });
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(closeCount).toBe(1);
  });

  it("closes when the pointer goes down outside it", () => {
    let closeCount = 0;
    renderPopup({ onClose: () => (closeCount += 1) });
    fireEvent.pointerDown(document.body);
    expect(closeCount).toBe(1);
  });

  it("stays open when the pointer goes down on a word that opens it", () => {
    let closeCount = 0;
    renderPopup({ onClose: () => (closeCount += 1) });
    fireEvent.pointerDown(screen.getByRole("button", { name: "Hund" }));
    expect(closeCount).toBe(0);
  });

  it("stays open when the pointer goes down inside it", () => {
    let closeCount = 0;
    renderPopup({ onClose: () => (closeCount += 1) });
    fireEvent.pointerDown(screen.getByRole("button", { name: "devour" }));
    expect(closeCount).toBe(0);
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

  it("says when the dictionaries could not be searched", () => {
    renderState({ kind: "failed", term: "fressen" });
    expect(
      screen.getByText("The dictionaries could not be searched for “fressen”."),
    ).toBeDefined();
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

describe("DictionaryPopup links", () => {
  it("looks up the target of a link in a definition", () => {
    const searched: string[] = [];
    render(
      <DictionaryPopup
        state={{
          kind: "found",
          term: "食べなかった",
          results: [exampleInflectedResult],
        }}
        mode="hover"
        resolveMediaUrl={() => null}
        onSearch={(term) => searched.push(term)}
        onCreateFlashcard={() => undefined}
        onClose={() => undefined}
        onSetUpDictionary={() => undefined}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "食う" }));
    expect(searched).toEqual(["食う"]);
  });
});
