import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClickableText } from "./ClickableText.tsx";
import type { WordGestures } from "./useWordGestures.ts";

beforeEach(() => vi.useFakeTimers());

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

type Gesture = "click" | "doubleClick" | "hoverIntent" | "hold";

/** Renders a sentence whose word gestures are recorded as `gesture word`. */
function renderSentence(options: Pick<WordGestures, "defersClick"> = {}) {
  const gestures: string[] = [];
  const record = (gesture: Gesture) => (hit: { word: string }) =>
    gestures.push(`${gesture} ${hit.word}`);
  render(
    <ClickableText
      text="Ich rufe an."
      gestures={{
        onWordClick: record("click"),
        onWordDoubleClick: record("doubleClick"),
        onWordHoverIntent: record("hoverIntent"),
        onWordHold: record("hold"),
        ...options,
      }}
    />,
  );
  return gestures;
}

const word = (name: string) => screen.getByRole("button", { name });

/** Fires what a browser fires for a double-click: two clicks counting up, then dblclick. */
function doubleClick(element: HTMLElement) {
  fireEvent.click(element, { detail: 1 });
  fireEvent.click(element, { detail: 2 });
  fireEvent.doubleClick(element, { detail: 2 });
}

function holdTouch(element: HTMLElement, ms: number) {
  fireEvent.pointerDown(element, { pointerType: "touch", clientX: 5 });
  act(() => vi.advanceTimersByTime(ms));
  fireEvent.pointerUp(element, { pointerType: "touch", clientX: 5 });
  fireEvent.click(element, { detail: 1 });
}

describe("useWordGestures", () => {
  it("reports a click at once", () => {
    const gestures = renderSentence();
    fireEvent.click(word("rufe"), { detail: 1 });
    expect(gestures).toEqual(["click rufe"]);
  });

  it("reports a key press on a word as a click", () => {
    const gestures = renderSentence({ defersClick: true });
    fireEvent.click(word("rufe"), { detail: 0 });
    expect(gestures).toEqual(["click rufe"]);
  });

  it("reports the first click of a double-click, then the double-click once", () => {
    const gestures = renderSentence();
    doubleClick(word("rufe"));
    expect(gestures).toEqual(["click rufe", "doubleClick rufe"]);
  });

  describe("when clicks are deferred", () => {
    it("reports a lone click once the double-click interval has passed", () => {
      const gestures = renderSentence({ defersClick: true });
      fireEvent.click(word("rufe"), { detail: 1 });
      act(() => vi.advanceTimersByTime(400));
      expect(gestures).toEqual(["click rufe"]);
    });

    it("reports only the double-click of a double-click", () => {
      const gestures = renderSentence({ defersClick: true });
      doubleClick(word("rufe"));
      act(() => vi.advanceTimersByTime(400));
      expect(gestures).toEqual(["doubleClick rufe"]);
    });
  });

  it("reports hover intent once the mouse has rested on a word", () => {
    const gestures = renderSentence();
    fireEvent.pointerEnter(word("rufe"), { pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(200));
    expect(gestures).toEqual(["hoverIntent rufe"]);
  });

  it("reports no hover intent for a mouse that passes quickly over a word", () => {
    const gestures = renderSentence();
    fireEvent.pointerEnter(word("rufe"), { pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(100));
    fireEvent.pointerLeave(word("rufe"), { pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(200));
    expect(gestures).toEqual([]);
  });

  it("reports a held tap and swallows the click that ends it", () => {
    const gestures = renderSentence();
    holdTouch(word("an"), 600);
    expect(gestures).toEqual(["hold an"]);
  });

  it("reports a short tap as a click", () => {
    const gestures = renderSentence();
    holdTouch(word("an"), 200);
    expect(gestures).toEqual(["click an"]);
  });

  it("reports no hold for a touch that moves away", () => {
    const gestures = renderSentence();
    fireEvent.pointerDown(word("an"), { pointerType: "touch", clientX: 5 });
    fireEvent.pointerMove(word("an"), { pointerType: "touch", clientX: 40 });
    act(() => vi.advanceTimersByTime(600));
    expect(gestures).toEqual([]);
  });
});
