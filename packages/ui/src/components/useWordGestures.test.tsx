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
import { WordClickMemoryProvider } from "./wordClickMemoryContext.tsx";

beforeEach(() => vi.useFakeTimers());

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

type Gesture =
  | "click"
  | "clickStarted"
  | "doubleClick"
  | "hoverIntent"
  | "hold";

/** Renders a sentence whose word gestures are recorded as `gesture word`. */
function renderSentence(
  options: Pick<WordGestures, "defersClick"> = {},
  text = "Ich rufe an.",
) {
  const gestures: string[] = [];
  const record = (gesture: Gesture) => (hit: { word: string }) =>
    gestures.push(`${gesture} ${hit.word}`);
  render(
    <ClickableText
      text={text}
      gestures={{
        onWordClick: record("click"),
        onWordDoubleClick: record("doubleClick"),
        onWordHoverIntent: record("hoverIntent"),
        onWordHold: record("hold"),
        onWordClickStarted: record("clickStarted"),
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

/** Taps an element with a finger at a horizontal position, as the browser counts the tap. */
function tap(element: HTMLElement, clientX: number, detail = 1) {
  fireEvent.pointerDown(element, { pointerType: "touch", clientX });
  fireEvent.pointerUp(element, { pointerType: "touch", clientX });
  fireEvent.click(element, { detail, clientX });
}

/**
 * Makes the browser report the caret before the character at `offset` of the element's text
 * wherever the pointer is, as `caretPositionFromPoint` does for the character under it.
 */
function pointAtCharacter(element: HTMLElement, offset: number) {
  Object.assign(document, {
    caretPositionFromPoint: () => ({ offsetNode: element.firstChild, offset }),
  });
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

  it("reports a double-click whose second click comes 400 ms after the first", () => {
    const gestures = renderSentence();
    fireEvent.click(word("rufe"), { detail: 1 });
    act(() => vi.advanceTimersByTime(400));
    fireEvent.click(word("rufe"), { detail: 2 });
    expect(gestures).toEqual(["click rufe", "doubleClick rufe"]);
  });

  it("reports a double-click for the word of the first click, when the second lands on another", () => {
    const gestures = renderSentence();
    fireEvent.click(word("rufe"), { detail: 1 });
    fireEvent.click(word("an"), { detail: 2 });
    expect(gestures).toEqual(["click rufe", "doubleClick rufe"]);
  });

  it("reports a click, not a double-click, for a second click 600 ms after the first", () => {
    const gestures = renderSentence();
    fireEvent.click(word("rufe"), { detail: 1 });
    act(() => vi.advanceTimersByTime(600));
    fireEvent.click(word("an"), { detail: 2 });
    expect(gestures).toEqual(["click rufe", "click an"]);
  });

  it("reports a click, not a double-click, for a second click whose first landed between words", () => {
    const { container } = render(
      <WordClickMemoryProvider>
        <ClickableText
          text="Ich rufe an."
          gestures={{
            onWordClick: (hit) => gestures.push(`click ${hit.word}`),
            onWordDoubleClick: (hit) =>
              gestures.push(`doubleClick ${hit.word}`),
          }}
        />
      </WordClickMemoryProvider>,
    );
    const gestures: string[] = [];
    fireEvent.click(word("rufe"), { detail: 1 });
    act(() => vi.advanceTimersByTime(1000));
    fireEvent.click(word("Ich"), { detail: 1 });
    fireEvent.click(container.firstChild as HTMLElement, { detail: 1 });
    fireEvent.click(word("an"), { detail: 2 });
    expect(gestures).toEqual(["click rufe", "click Ich", "click an"]);
  });

  it("reports Shift+Enter on a word as a double-click", () => {
    const gestures = renderSentence();
    fireEvent.click(word("rufe"), { detail: 0, shiftKey: true });
    expect(gestures).toEqual(["doubleClick rufe"]);
  });

  it("does not let an earlier held tap swallow a key press", () => {
    const gestures = renderSentence();
    fireEvent.pointerDown(word("an"), { pointerType: "touch" });
    act(() => vi.advanceTimersByTime(600));
    fireEvent.click(word("an"), { detail: 0 });
    expect(gestures).toEqual(["hold an", "click an"]);
  });

  it("reports no hover intent for a word removed while the mouse rested on it", () => {
    const gestures = renderSentence();
    fireEvent.pointerEnter(word("rufe"), { pointerType: "mouse" });
    word("rufe").remove();
    act(() => vi.advanceTimersByTime(200));
    expect(gestures).toEqual([]);
  });

  describe("when clicks are deferred", () => {
    it("reports at once that a click has begun", () => {
      const gestures = renderSentence({ defersClick: true });
      fireEvent.click(word("rufe"), { detail: 1 });
      expect(gestures).toEqual(["clickStarted rufe"]);
    });

    it("reports a lone click once the double-click interval has passed", () => {
      const gestures = renderSentence({ defersClick: true });
      fireEvent.click(word("rufe"), { detail: 1 });
      act(() => vi.advanceTimersByTime(500));
      expect(gestures).toEqual(["clickStarted rufe", "click rufe"]);
    });

    it("reports only the double-click of a double-click", () => {
      const gestures = renderSentence({ defersClick: true });
      doubleClick(word("rufe"));
      act(() => vi.advanceTimersByTime(500));
      expect(gestures).toEqual(["clickStarted rufe", "doubleClick rufe"]);
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

  describe("in a run of Japanese", () => {
    afterEach(() => {
      Reflect.deleteProperty(document, "caretPositionFromPoint");
    });

    it("reports a click from the character under the pointer", () => {
      const gestures = renderSentence({}, "映画を見る");
      pointAtCharacter(word("映画を見る"), 3);
      fireEvent.click(word("映画を見る"), { detail: 1, clientX: 50 });
      expect(gestures).toEqual(["click 見る"]);
    });

    it("reports a click from a character outside the Basic Multilingual Plane", () => {
      const gestures = renderSentence({}, "𠮷野家");
      pointAtCharacter(word("𠮷野家"), 2);
      fireEvent.click(word("𠮷野家"), { detail: 1, clientX: 50 });
      expect(gestures).toEqual(["click 野家"]);
    });

    it("never reports half of a character outside the Basic Multilingual Plane", () => {
      const gestures = renderSentence({}, "𠮷野家");
      pointAtCharacter(word("𠮷野家"), 1);
      fireEvent.click(word("𠮷野家"), { detail: 1, clientX: 50 });
      expect(gestures).toEqual(["click 𠮷野家"]);
    });

    it("reports a key press from the start of the run", () => {
      const gestures = renderSentence({}, "映画を見る");
      pointAtCharacter(word("映画を見る"), 3);
      fireEvent.click(word("映画を見る"), { detail: 0 });
      expect(gestures).toEqual(["click 映画を見る"]);
    });

    it("reports a click from the start of the run when the browser cannot tell the character", () => {
      const gestures = renderSentence({}, "映画を見る");
      fireEvent.click(word("映画を見る"), { detail: 1, clientX: 50 });
      expect(gestures).toEqual(["click 映画を見る"]);
    });

    it("waits for the mouse to rest on the character it has moved to", () => {
      const gestures = renderSentence({}, "映画を見る");
      const run = word("映画を見る");
      pointAtCharacter(run, 0);
      fireEvent.pointerEnter(run, { pointerType: "mouse", clientX: 5 });
      act(() => vi.advanceTimersByTime(100));
      pointAtCharacter(run, 3);
      fireEvent.pointerMove(run, { pointerType: "mouse", clientX: 50 });
      act(() => vi.advanceTimersByTime(150));
      expect(gestures).toEqual(["hoverIntent 見る"]);
    });

    it("reports a held tap from the character under the finger", () => {
      const gestures = renderSentence({}, "映画を見る");
      pointAtCharacter(word("映画を見る"), 3);
      fireEvent.pointerDown(word("映画を見る"), {
        pointerType: "touch",
        clientX: 50,
      });
      act(() => vi.advanceTimersByTime(600));
      expect(gestures).toEqual(["hold 見る"]);
    });

    it("reports a Latin word next to the run from its start", () => {
      const gestures = renderSentence({}, "今日はNetflixで");
      pointAtCharacter(word("Netflix"), 3);
      fireEvent.click(word("Netflix"), { detail: 1, clientX: 50 });
      expect(gestures).toEqual(["click Netflix"]);
    });
  });

  describe("on a touch screen", () => {
    it("reports two quick taps on a word as a double-click", () => {
      const gestures = renderSentence();
      tap(word("rufe"), 40);
      act(() => vi.advanceTimersByTime(250));
      tap(word("rufe"), 42);
      expect(gestures).toEqual(["click rufe", "doubleClick rufe"]);
    });

    it("reports a double tap the browser counts as one once", () => {
      const gestures = renderSentence();
      tap(word("rufe"), 40);
      tap(word("rufe"), 42, 2);
      expect(gestures).toEqual(["click rufe", "doubleClick rufe"]);
    });

    it("reports taps further apart in time than the double-click interval as two clicks", () => {
      const gestures = renderSentence();
      tap(word("rufe"), 40);
      act(() => vi.advanceTimersByTime(600));
      tap(word("rufe"), 40);
      expect(gestures).toEqual(["click rufe", "click rufe"]);
    });

    it("reports quick taps on two words apart from each other as two clicks", () => {
      const gestures = renderSentence();
      tap(word("rufe"), 40);
      tap(word("an"), 120);
      expect(gestures).toEqual(["click rufe", "click an"]);
    });
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
