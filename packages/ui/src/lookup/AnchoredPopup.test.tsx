import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnchoredPopup } from "./AnchoredPopup.tsx";
import type { AnchorRect } from "./placeAtAnchor.ts";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** A word on the page whose place the test sets. */
function createWord(rect: AnchorRect) {
  const word = document.createElement("button");
  document.body.append(word);
  let current = rect;
  vi.spyOn(word, "getBoundingClientRect").mockImplementation(
    () =>
      ({
        ...current,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        toJSON: () => current,
      }) as DOMRect,
  );
  return {
    word,
    moveTo: (next: AnchorRect) => {
      current = next;
    },
  };
}

const lowWord = { top: 700, bottom: 720, left: 100, right: 140 };
const higherWord = { top: 620, bottom: 640, left: 100, right: 140 };
const topWord = { top: 40, bottom: 60, left: 100, right: 140 };

function renderAt(word: Element, size?: "compact" | "expanded") {
  const { container } = render(
    <AnchoredPopup anchor={word} size={size}>
      <section aria-label="Dictionary" />
    </AnchoredPopup>,
  );
  const wrapper = () =>
    container.querySelector("[data-side]") as HTMLElement | null;
  return Object.assign(() => wrapper()?.style.bottom, {
    size: () => wrapper()?.getAttribute("data-size"),
    isGliding: () => wrapper()?.className.includes("transition-"),
  });
}

/** Lets the pop-up measure its word again, as it does when the window is resized. */
function remeasure() {
  act(() => {
    window.dispatchEvent(new Event("resize"));
  });
}

describe("AnchoredPopup", () => {
  it("appears at its first place at once", () => {
    const { word } = createWord(lowWord);
    const style = renderAt(word);
    expect(style.isGliding()).toBe(false);
  });

  it("glides to its word's new place on the same side", () => {
    const { word, moveTo } = createWord(lowWord);
    const style = renderAt(word);
    moveTo(higherWord);
    remeasure();
    expect(style.isGliding()).toBe(true);
  });

  it("moves at once to its word's other side", () => {
    const { word, moveTo } = createWord(lowWord);
    const style = renderAt(word);
    moveTo(higherWord);
    remeasure();
    moveTo(topWord);
    remeasure();
    expect(style.isGliding()).toBe(false);
  });

  it("glides again once it has moved on the side it changed to", () => {
    const { word, moveTo } = createWord(lowWord);
    const style = renderAt(word);
    moveTo(topWord);
    remeasure();
    moveTo({ ...topWord, top: 60, bottom: 80 });
    remeasure();
    expect(style.isGliding()).toBe(true);
  });

  it("takes the pop-up's size, so that it is centred by that width", () => {
    const { word } = createWord(lowWord);
    const style = renderAt(word, "expanded");
    expect(style.size()).toBe("expanded");
  });

  it("stands above a word low on the screen", () => {
    const { word } = createWord(lowWord);
    const bottomOf = renderAt(word);
    expect(bottomOf()).toBe(`${window.innerHeight - 700 + 8}px`);
  });

  it("follows its word when the window is resized", () => {
    const { word, moveTo } = createWord(lowWord);
    const bottomOf = renderAt(word);
    moveTo(higherWord);
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    expect(bottomOf()).toBe(`${window.innerHeight - 620 + 8}px`);
  });

  it("follows its word when something scrolls", () => {
    const { word, moveTo } = createWord(lowWord);
    const bottomOf = renderAt(word);
    moveTo(higherWord);
    act(() => {
      fireEvent.scroll(document.body);
    });
    expect(bottomOf()).toBe(`${window.innerHeight - 620 + 8}px`);
  });

  it("stays where its word last was once the word is gone", () => {
    const { word, moveTo } = createWord(lowWord);
    const bottomOf = renderAt(word);
    word.remove();
    moveTo({ top: 0, bottom: 0, left: 0, right: 0 });
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    expect(bottomOf()).toBe(`${window.innerHeight - 700 + 8}px`);
  });
});
