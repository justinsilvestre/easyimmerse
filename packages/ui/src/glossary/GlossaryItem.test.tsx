import { resetBackend } from "@easyimmerse/backend";
import { actions, selectLookup } from "@easyimmerse/state";
import type { Glossary } from "@easyimmerse/types";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { findStructuredEntry } from "../testSupport/fixtureStructuredLookup.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { GlossaryItem } from "./GlossaryItem.tsx";

afterEach(() => {
  cleanup();
  resetBackend();
});

function renderItem(glossary: Glossary) {
  const rendered = renderWithAppStore(
    <div data-testid="item">
      <GlossaryItem glossary={glossary} dictionaryId="d3" />
    </div>,
  );
  act(() => rendered.store.dispatch(actions.lookupOpenedForTyping()));
  return rendered;
}

const [catItem] = findStructuredEntry("猫").definitions;
const [dogText, dogImage, dogString] = findStructuredEntry("犬").definitions;
const [ateDeinflection] = findStructuredEntry("食べた").definitions;

const findItem = () => screen.getByTestId("item");

describe("GlossaryItem", () => {
  it("shows a plain string", () => {
    renderItem(dogString as Glossary);
    expect(findItem().textContent).toBe("hound");
  });

  it("shows a text item", () => {
    renderItem(dogText as Glossary);
    expect(findItem().textContent).toBe("dog");
  });

  it("shows an image item", () => {
    renderItem(dogImage as Glossary);
    expect(screen.getByRole("img", { name: "not a dog" })).toBeTruthy();
  });

  it("shows the description of an image item", () => {
    renderItem({ type: "image", path: "img/cat.svg", description: "A cat." });
    expect(findItem().textContent).toContain("A cat.");
  });

  it("shows structured content", () => {
    renderItem(catItem as Glossary);
    expect(findItem().querySelector("ul > li")?.textContent).toBe("cat");
  });

  describe("for an inflected form", () => {
    it("names the form it comes from and the inflections", () => {
      renderItem(ateDeinflection as Glossary);
      expect(findItem().textContent).toBe("Inflected form of 食べる (past)");
    });

    it("looks up the uninflected form when clicked", () => {
      const { store } = renderItem(ateDeinflection as Glossary);
      fireEvent.click(screen.getByRole("button", { name: "食べる" }));
      expect(selectLookup(store.getState())).toMatchObject({ term: "食べる" });
    });
  });
});
