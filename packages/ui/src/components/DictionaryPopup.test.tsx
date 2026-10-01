import { resetBackend } from "@easyimmerse/backend";
import { type AppAction, actions, selectLookup } from "@easyimmerse/state";
import type { TermEntry } from "@easyimmerse/types";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fixtureBilingualEntry,
  fixtureLookupResults,
} from "../testSupport/fixtureLookup.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { DictionaryPopup } from "./DictionaryPopup.tsx";

afterEach(() => {
  cleanup();
  resetBackend();
  vi.useRealTimers();
});

const hoverKatze = actions.wordHovered({
  word: "Katze",
  context: "Die Katze schläft.",
  clip: null,
});

function renderPopup(
  props: Partial<ComponentProps<typeof DictionaryPopup>> = {},
  opening: AppAction | null = hoverKatze,
) {
  const created: (TermEntry | null)[] = [];
  const setUpRequests: string[] = [];
  const rendered = renderWithAppStore(
    <DictionaryPopup
      results={fixtureLookupResults}
      status="idle"
      hasDictionaries
      onCreateFlashcard={(entry) => created.push(entry)}
      onSetUpDictionary={() => setUpRequests.push("set up")}
      {...props}
    />,
  );
  if (opening !== null) act(() => rendered.store.dispatch(opening));
  return { ...rendered, created, setUpRequests };
}

const findPopup = () => screen.queryByRole("dialog", { name: "Dictionary" });

const isLookupOpen = (store: ReturnType<typeof renderPopup>["store"]) =>
  selectLookup(store.getState()).kind === "open";

describe("DictionaryPopup", () => {
  it("renders nothing while the lookup is closed", () => {
    renderPopup({}, null);
    expect(findPopup()).toBeNull();
  });

  it("shows the hovered term as its heading", () => {
    renderPopup();
    expect(screen.getByRole("heading", { name: "Katze" })).toBeTruthy();
  });

  it("shows the sentence the term came from", () => {
    renderPopup();
    expect(screen.getByText("Die Katze schläft.")).toBeTruthy();
  });

  it("shows a heading for each dictionary with entries", () => {
    renderPopup();
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(2);
  });

  it("lists each definition of an entry", () => {
    renderPopup();
    expect(screen.getByText("female cat, as opposed to a tomcat")).toBeTruthy();
  });

  it("makes a flashcard from the clicked entry", () => {
    const { created } = renderPopup();
    const [firstEntry] = screen.getAllByRole("button", {
      name: "Make flashcard from Katze",
    });
    fireEvent.click(firstEntry as HTMLElement);
    expect(created).toEqual([fixtureBilingualEntry]);
  });

  it("makes a flashcard from no particular entry with the header button", () => {
    const { created } = renderPopup();
    fireEvent.click(screen.getByRole("button", { name: "Make flashcard" }));
    expect(created).toEqual([null]);
  });

  it("closes the lookup with the close button", () => {
    const { store } = renderPopup();
    fireEvent.click(screen.getByRole("button", { name: "Close dictionary" }));
    expect(isLookupOpen(store)).toBe(false);
  });

  it("closes the lookup on Escape", () => {
    const { store } = renderPopup();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(isLookupOpen(store)).toBe(false);
  });

  it("closes the lookup on a mouse press outside it", () => {
    const { store } = renderPopup();
    fireEvent.mouseDown(document.body);
    expect(isLookupOpen(store)).toBe(false);
  });

  it("stays open on a mouse press on a word button", () => {
    const { store } = renderPopup();
    const word = document.body.appendChild(document.createElement("button"));
    word.setAttribute("data-word", "");
    fireEvent.mouseDown(word);
    expect(isLookupOpen(store)).toBe(true);
  });

  it("stays open on a mouse press inside it", () => {
    const { store } = renderPopup();
    fireEvent.mouseDown(screen.getByRole("heading", { name: "Katze" }));
    expect(isLookupOpen(store)).toBe(true);
  });

  describe("while the lookup is loading", () => {
    it("announces the lookup in progress", () => {
      renderPopup({ status: "loading", results: [] });
      expect(screen.getByRole("status").textContent).toBe("Looking up Katze…");
    });
  });

  describe("when the lookup failed", () => {
    it("shows an alert", () => {
      renderPopup({ status: "error", results: [] });
      expect(screen.getByRole("alert")).toBeTruthy();
    });
  });

  describe("when no dictionary has the term", () => {
    it("says that there are no entries", () => {
      renderPopup({ results: [] });
      expect(screen.getByText("No entries for Katze")).toBeTruthy();
    });
  });

  describe("when the project has no dictionary", () => {
    it("offers to set one up", () => {
      const { setUpRequests } = renderPopup({
        hasDictionaries: false,
        results: [],
      });
      fireEvent.click(
        screen.getByRole("button", { name: "Set up a dictionary" }),
      );
      expect(setUpRequests).toEqual(["set up"]);
    });
  });

  describe("when opened for typing", () => {
    const openForTyping = actions.lookupOpenedForTyping();
    const findInput = () => screen.getByRole("searchbox", { name: "Word" });

    it("focuses the term input", () => {
      renderPopup({ results: [] }, openForTyping);
      expect(document.activeElement).toBe(findInput());
    });

    it("sends the typed term once typing pauses", () => {
      vi.useFakeTimers();
      const { store } = renderPopup({ results: [] }, openForTyping);
      fireEvent.change(findInput(), { target: { value: "Hund" } });
      act(() => vi.advanceTimersByTime(300));
      expect(selectLookup(store.getState())).toMatchObject({ term: "Hund" });
    });

    it("waits for typing to pause before sending the term", () => {
      vi.useFakeTimers();
      const { store } = renderPopup({ results: [] }, openForTyping);
      fireEvent.change(findInput(), { target: { value: "Hund" } });
      act(() => vi.advanceTimersByTime(299));
      expect(selectLookup(store.getState())).toMatchObject({ term: "" });
    });
  });
});
