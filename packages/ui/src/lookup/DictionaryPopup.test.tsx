import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DictionaryPopup } from "./DictionaryPopup.tsx";
import {
  exampleInflectedResult,
  exampleKanjiResult,
} from "./exampleJapaneseLookup.ts";
import { exampleResults } from "./exampleLookup.ts";
import type { LookupState } from "./lookupState.ts";

afterEach(cleanup);

type PopupHandlers = {
  state?: LookupState;
  onSearch?: (term: string) => void;
  onCreateFlashcard?: (entryIndex: number | null) => void;
  onClose?: () => void;
};

const foundState: LookupState = {
  kind: "found",
  term: "fressen",
  results: exampleResults,
};

function renderPopup({
  state = foundState,
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
        state={state}
        resolveMediaUrl={() => null}
        mode="word"
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

  it("creates a flashcard with the header button when no entry is found", () => {
    const created: (number | null)[] = [];
    renderPopup({
      state: { kind: "notFound", term: "Hundi" },
      onCreateFlashcard: (index) => created.push(index),
    });
    fireEvent.click(screen.getByRole("button", { name: "Flashcard" }));
    expect(created).toEqual([null]);
  });

  it("offers no flashcard while the word is looked up", () => {
    renderPopup({ state: { kind: "loading", term: "Hundi" } });
    expect(screen.queryByRole("button", { name: "Flashcard" })).toBeNull();
  });

  it("offers no flashcard while no dictionary is set up", () => {
    renderPopup({ state: { kind: "noDictionary", language: "de" } });
    expect(screen.queryByRole("button", { name: "Flashcard" })).toBeNull();
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

  it("closes on a click outside it", () => {
    let closeCount = 0;
    renderPopup({ onClose: () => (closeCount += 1) });
    fireEvent.click(document.body);
    expect(closeCount).toBe(1);
  });

  it("stays open on a click on a word that opens it", () => {
    let closeCount = 0;
    renderPopup({ onClose: () => (closeCount += 1) });
    fireEvent.click(screen.getByRole("button", { name: "Hund" }));
    expect(closeCount).toBe(0);
  });

  it("stays open on a click inside it that removes the clicked element before the click reaches the page", () => {
    let closeCount = 0;
    renderPopup({ onClose: () => (closeCount += 1) });
    const button = screen.getByRole("button", { name: "Flashcard" });
    // A browser re-renders between the element's own handler and the page's, as when a link inside is followed.
    button.addEventListener("click", () => button.remove());
    fireEvent.click(button);
    expect(closeCount).toBe(0);
  });

  it("stays open on a click inside it", () => {
    let closeCount = 0;
    renderPopup({ onClose: () => (closeCount += 1) });
    fireEvent.click(screen.getByRole("button", { name: "devour" }));
    expect(closeCount).toBe(0);
  });

  it("ignores Escape while its screen is inert beneath another", () => {
    let closeCount = 0;
    render(
      <div inert>
        <DictionaryPopup
          state={null}
          mode="word"
          resolveMediaUrl={() => null}
          onSearch={() => undefined}
          onCreateFlashcard={() => undefined}
          onClose={() => (closeCount += 1)}
          onSetUpDictionary={() => undefined}
        />
      </div>,
    );
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(closeCount).toBe(0);
  });

  it("returns focus to the control that opened it in search mode", () => {
    render(<SearchOpener />);
    const opener = screen.getByRole("button", { name: "Look up" });
    opener.focus();
    fireEvent.click(opener);
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Escape" });
    expect(document.activeElement).toBe(opener);
  });
});

/** A lookup button that opens the pop-up on its search field, as the media screen does. */
function SearchOpener() {
  const [isOpen, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Look up
      </button>
      {isOpen && (
        <DictionaryPopup
          state={null}
          mode="search"
          resolveMediaUrl={() => null}
          onSearch={() => undefined}
          onCreateFlashcard={() => undefined}
          onClose={() => setOpen(false)}
          onSetUpDictionary={() => undefined}
        />
      )}
    </>
  );
}

function renderState(state: LookupState) {
  render(
    <DictionaryPopup
      state={state}
      mode="word"
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

  it("names the chosen word in its field when no dictionary is set up", () => {
    renderState({ kind: "noDictionary", language: "de", term: "Hund" });
    expect(
      screen.getByRole("textbox", { name: "Word to look up" }),
    ).toHaveProperty("value", "Hund");
  });

  it("fills its field with the word shown", () => {
    renderState({ kind: "loading", term: "fressen" });
    expect(
      screen.getByRole("textbox", { name: "Word to look up" }),
    ).toHaveProperty("value", "fressen");
  });

  it("looks up what is typed over the word shown", () => {
    const searched: string[] = [];
    renderPopup({ onSearch: (term) => searched.push(term) });
    const field = screen.getByRole("textbox", { name: "Word to look up" });
    fireEvent.change(field, { target: { value: "Katze" } });
    fireEvent.submit(field);
    expect(searched).toEqual(["Katze"]);
  });

  it("offers the dictionaries settings when nothing was found", () => {
    let opened = 0;
    render(
      <DictionaryPopup
        state={{ kind: "notFound", term: "Hundi" }}
        mode="word"
        resolveMediaUrl={() => null}
        onSearch={() => undefined}
        onCreateFlashcard={() => undefined}
        onClose={() => undefined}
        onSetUpDictionary={() => (opened += 1)}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Check your dictionaries" }),
    );
    expect(opened).toBe(1);
  });

  it("closes once its screen becomes inert beneath another", async () => {
    let closeCount = 0;
    render(
      <div data-testid="screen">
        <DictionaryPopup
          state={null}
          mode="word"
          resolveMediaUrl={() => null}
          onSearch={() => undefined}
          onCreateFlashcard={() => undefined}
          onClose={() => (closeCount += 1)}
          onSetUpDictionary={() => undefined}
        />
      </div>,
    );
    screen.getByTestId("screen").setAttribute("inert", "");
    await vi.waitFor(() => expect(closeCount).toBe(1));
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
  it("stays open when a followed link re-renders it before the click reaches the page", () => {
    let closeCount = 0;
    render(
      <DictionaryPopup
        state={{
          kind: "found",
          term: "食べなかった",
          results: [exampleInflectedResult],
        }}
        mode="word"
        resolveMediaUrl={() => null}
        onSearch={() => undefined}
        onCreateFlashcard={() => undefined}
        onClose={() => (closeCount += 1)}
        onSetUpDictionary={() => undefined}
      />,
    );
    const link = screen.getByRole("button", { name: "食う" });
    link.addEventListener("click", () => link.remove());
    fireEvent.click(link);
    expect(closeCount).toBe(0);
  });

  it("looks up the target of a link in a definition", () => {
    const searched: string[] = [];
    render(
      <DictionaryPopup
        state={{
          kind: "found",
          term: "食べなかった",
          results: [exampleInflectedResult],
        }}
        mode="word"
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
