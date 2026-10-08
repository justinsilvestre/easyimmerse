import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClickableText } from "./ClickableText.tsx";
import { WordClickMemoryProvider } from "./wordClickMemoryContext.tsx";

beforeEach(() => vi.useFakeTimers());

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

type Gesture = "click" | "doubleClick" | "hover" | "hoverAnswered" | "hold";

/** Renders a sentence whose word gestures are recorded as `gesture word`. */
function renderSentence(text = "Ich rufe an.") {
  const gestures: string[] = [];
  const record = (gesture: Gesture) => (hit: { word: string }) => {
    gestures.push(`${gesture} ${hit.word}`);
  };
  render(
    <ClickableText
      text={text}
      gestures={{
        onWordClick: record("click"),
        onWordDoubleClick: record("doubleClick"),
        onWordHover: record("hover"),
        onWordHoverAnswered: record("hoverAnswered"),
        onWordHold: record("hold"),
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
 * Lays text out as the browser would in a monospaced font, each UTF-16 code unit 16 px wide on one line 20 px high,
 * so that a character outside the Basic Multilingual Plane is 32 px wide.
 */
/**
 * Lays each character of a run out 16 pixels wide, as the characters' ranges would report.
 * A highlight splits a run's text into several nodes, so a character's place counts from the run's start.
 */
function layOutCharacters() {
  vi.spyOn(Range.prototype, "getClientRects").mockImplementation(function (
    this: Range,
  ) {
    const start = offsetInRun(this.startContainer) + this.startOffset;
    const rect = new DOMRect(
      start * 16,
      0,
      (this.endOffset - this.startOffset) * 16,
      20,
    );
    return Object.assign([rect], {
      item: () => rect,
    }) as unknown as DOMRectList;
  });
}

/** How many code units of the run's text come before the node, within the run's button. */
function offsetInRun(node: Node): number {
  const button = node.parentElement?.closest("button");
  if (!button) return 0;
  const walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT);
  let offset = 0;
  for (
    let text = walker.nextNode();
    text && text !== node;
    text = walker.nextNode()
  )
    offset += (text as Text).data.length;
  return offset;
}

describe("useWordGestures", () => {
  it("reports a click at once", () => {
    const gestures = renderSentence();
    fireEvent.click(word("rufe"), { detail: 1 });
    expect(gestures).toEqual(["click rufe"]);
  });

  it("reports a key press on a word as a click", () => {
    const gestures = renderSentence();
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

  it("reports no hover for a word removed while the mouse rested on it", () => {
    const gestures = renderSentence();
    fireEvent.pointerEnter(word("rufe"), { pointerType: "mouse" });
    word("rufe").remove();
    act(() => vi.advanceTimersByTime(200));
    expect(gestures).toEqual([]);
  });

  it("reports a hover as soon as the mouse has stayed on a word for 40 ms", () => {
    const gestures = renderSentence();
    fireEvent.pointerEnter(word("rufe"), { pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(40));
    expect(gestures).toContain("hover rufe");
  });

  it("reports the answer of a hover with nothing to wait for at once", () => {
    const gestures = renderSentence();
    fireEvent.pointerEnter(word("rufe"), { pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(40));
    expect(gestures).toEqual(["hover rufe", "hoverAnswered rufe"]);
  });

  describe("when a hover answers later", () => {
    /** Renders a sentence whose hovers answer only when the test resolves them, recording each answer reported. */
    function renderAnswering() {
      const answers: string[] = [];
      let resolve: (length: number | null) => void = () => undefined;
      render(
        <ClickableText
          text="Ich rufe an."
          gestures={{
            onWordHover: () =>
              new Promise<number | null>((settle) => {
                resolve = settle;
              }),
            onWordHoverAnswered: (hit, matchedLength) =>
              answers.push(`${hit.word} ${matchedLength}`),
          }}
        />,
      );
      return { answers, answer: (length: number | null) => resolve(length) };
    }

    it("reports nothing until the hover answers", () => {
      const { answers } = renderAnswering();
      fireEvent.pointerEnter(word("rufe"), { pointerType: "mouse" });
      act(() => vi.advanceTimersByTime(200));
      expect(answers).toEqual([]);
    });

    it("reports the answer with the length matched", async () => {
      const { answers, answer } = renderAnswering();
      fireEvent.pointerEnter(word("rufe"), { pointerType: "mouse" });
      act(() => vi.advanceTimersByTime(40));
      await act(async () => answer(4));
      expect(answers).toEqual(["rufe 4"]);
    });

    it("drops the answer once the mouse has left the word", async () => {
      const { answers, answer } = renderAnswering();
      fireEvent.pointerEnter(word("rufe"), { pointerType: "mouse" });
      act(() => vi.advanceTimersByTime(40));
      fireEvent.pointerLeave(word("rufe"), { pointerType: "mouse" });
      await act(async () => answer(4));
      expect(answers).toEqual([]);
    });
  });

  it("reports no hover for a mouse that sweeps over a word", () => {
    const gestures = renderSentence();
    fireEvent.pointerEnter(word("rufe"), { pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(30));
    fireEvent.pointerLeave(word("rufe"), { pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(200));
    expect(gestures).toEqual([]);
  });

  describe("for the unit under the mouse", () => {
    afterEach(() => vi.restoreAllMocks());

    /** Renders a sentence that records the word or character the mouse is over, or "none" when it leaves. */
    function renderPointed(text: string) {
      const pointed: string[] = [];
      render(
        <ClickableText
          text={text}
          gestures={{
            onWordPointed: (hit) => pointed.push(hit?.word ?? "none"),
          }}
        />,
      );
      return pointed;
    }

    it("reports the word the mouse enters", () => {
      const pointed = renderPointed("Ich rufe an.");
      fireEvent.pointerEnter(word("rufe"), { pointerType: "mouse" });
      expect(pointed).toEqual(["rufe"]);
    });

    it("reports nothing for a finger", () => {
      const pointed = renderPointed("Ich rufe an.");
      fireEvent.pointerEnter(word("rufe"), { pointerType: "touch" });
      expect(pointed).toEqual([]);
    });

    it("reports the mouse leaving the word", () => {
      const pointed = renderPointed("Ich rufe an.");
      fireEvent.pointerEnter(word("rufe"), { pointerType: "mouse" });
      fireEvent.pointerLeave(word("rufe"), { pointerType: "mouse" });
      expect(pointed).toEqual(["rufe", "none"]);
    });

    it("reports each character of a run the mouse moves to", () => {
      const pointed = renderPointed("映画を見る");
      layOutCharacters();
      const run = word("映画を見る");
      fireEvent.pointerEnter(run, {
        pointerType: "mouse",
        clientX: 5,
        clientY: 10,
      });
      fireEvent.pointerMove(run, {
        pointerType: "mouse",
        clientX: 50,
        clientY: 10,
      });
      expect(pointed).toEqual(["映画を見る", "見る"]);
    });
  });

  describe("in a run of Japanese", () => {
    afterEach(() => vi.restoreAllMocks());

    it("reports a click from the character under the pointer", () => {
      const gestures = renderSentence("映画を見る");
      layOutCharacters();
      fireEvent.click(word("映画を見る"), {
        detail: 1,
        clientX: 50,
        clientY: 10,
      });
      expect(gestures).toEqual(["click 見る"]);
    });

    it("reports a click from a character after one outside the Basic Multilingual Plane", () => {
      const gestures = renderSentence("𠮷野家");
      layOutCharacters();
      fireEvent.click(word("𠮷野家"), { detail: 1, clientX: 40, clientY: 10 });
      expect(gestures).toEqual(["click 野家"]);
    });

    it("reports a click on the right half of a character outside the Basic Multilingual Plane from that character", () => {
      const gestures = renderSentence("𠮷野家");
      layOutCharacters();
      fireEvent.click(word("𠮷野家"), { detail: 1, clientX: 30, clientY: 10 });
      expect(gestures).toEqual(["click 𠮷野家"]);
    });

    it("reports a key press from the start of the run", () => {
      const gestures = renderSentence("映画を見る");
      layOutCharacters();
      fireEvent.click(word("映画を見る"), { detail: 0 });
      expect(gestures).toEqual(["click 映画を見る"]);
    });

    it("reports a click from the start of the run when no character lies under the pointer", () => {
      const gestures = renderSentence("映画を見る");
      fireEvent.click(word("映画を見る"), {
        detail: 1,
        clientX: 50,
        clientY: 10,
      });
      expect(gestures).toEqual(["click 映画を見る"]);
    });

    it("waits for the mouse to rest on the character it has moved to", () => {
      const gestures = renderSentence("映画を見る");
      layOutCharacters();
      const run = word("映画を見る");
      fireEvent.pointerEnter(run, {
        pointerType: "mouse",
        clientX: 5,
        clientY: 10,
      });
      act(() => vi.advanceTimersByTime(100));
      fireEvent.pointerMove(run, {
        pointerType: "mouse",
        clientX: 50,
        clientY: 10,
      });
      act(() => vi.advanceTimersByTime(30));
      expect(gestures).toEqual([
        "hover 映画を見る",
        "hoverAnswered 映画を見る",
      ]);
    });

    it("looks up only the character the mouse comes to rest on, not those it sweeps over", () => {
      const gestures = renderSentence("映画を見る");
      layOutCharacters();
      const run = word("映画を見る");
      fireEvent.pointerEnter(run, {
        pointerType: "mouse",
        clientX: 5,
        clientY: 10,
      });
      for (const clientX of [20, 40, 50]) {
        act(() => vi.advanceTimersByTime(20));
        fireEvent.pointerMove(run, {
          pointerType: "mouse",
          clientX,
          clientY: 10,
        });
      }
      act(() => vi.advanceTimersByTime(40));
      expect(gestures).toEqual(["hover 見る", "hoverAnswered 見る"]);
    });

    it("reports a held tap from the character under the finger", () => {
      const gestures = renderSentence("映画を見る");
      layOutCharacters();
      fireEvent.pointerDown(word("映画を見る"), {
        pointerType: "touch",
        clientX: 50,
        clientY: 10,
      });
      act(() => vi.advanceTimersByTime(600));
      expect(gestures).toEqual(["hold 見る"]);
    });

    it("reports a tap from where the finger came down, as a held tap would", () => {
      const gestures = renderSentence("映画を見る");
      layOutCharacters();
      const run = word("映画を見る");
      fireEvent.pointerDown(run, {
        pointerType: "touch",
        clientX: 50,
        clientY: 10,
      });
      fireEvent.pointerUp(run, {
        pointerType: "touch",
        clientX: 58,
        clientY: 10,
      });
      fireEvent.click(run, { detail: 1, clientX: 66, clientY: 10 });
      expect(gestures).toEqual(["click 見る"]);
    });

    it("reports a Latin word next to the run from its start", () => {
      const gestures = renderSentence("今日はNetflixで");
      layOutCharacters();
      fireEvent.click(word("Netflix"), { detail: 1, clientX: 50, clientY: 10 });
      expect(gestures).toEqual(["click Netflix"]);
    });
  });

  describe("with the keyboard", () => {
    function focusWord(name: string) {
      const button = word(name);
      fireEvent.focus(button);
      return button;
    }

    const press = (button: HTMLElement, key: string, times = 1) => {
      for (let count = 0; count < times; count += 1)
        fireEvent.keyDown(button, { key });
    };

    /** The gestures other than the hovers that pointing with the keyboard reports along the way. */
    const actionsIn = (gestures: string[]) =>
      gestures.filter((gesture) => !gesture.startsWith("hover"));

    it("looks up from the character Right has moved to", () => {
      const gestures = renderSentence("映画を見る");
      const run = focusWord("映画を見る");
      press(run, "ArrowRight", 3);
      fireEvent.click(run, { detail: 0 });
      expect(actionsIn(gestures)).toEqual(["click 見る"]);
    });

    it("moves back with Left", () => {
      const gestures = renderSentence("映画を見る");
      const run = focusWord("映画を見る");
      press(run, "ArrowRight", 3);
      press(run, "ArrowLeft");
      fireEvent.click(run, { detail: 0 });
      expect(actionsIn(gestures)).toEqual(["click を見る"]);
    });

    it("starts a flashcard from that character with Shift+Enter", () => {
      const gestures = renderSentence("映画を見る");
      const run = focusWord("映画を見る");
      press(run, "ArrowRight", 3);
      fireEvent.click(run, { detail: 0, shiftKey: true });
      expect(actionsIn(gestures)).toEqual(["doubleClick 見る"]);
    });

    it("steps over a character outside the Basic Multilingual Plane whole", () => {
      const gestures = renderSentence("𠮷野家");
      const run = focusWord("𠮷野家");
      press(run, "ArrowRight");
      fireEvent.click(run, { detail: 0 });
      expect(actionsIn(gestures)).toEqual(["click 野家"]);
    });

    it("stops at the last character of the text", () => {
      const gestures = renderSentence("見る");
      const run = focusWord("見る");
      press(run, "ArrowRight", 5);
      fireEvent.click(run, { detail: 0 });
      expect(actionsIn(gestures)).toEqual(["click る"]);
    });

    it("stops at the first character of the text", () => {
      const gestures = renderSentence("見る");
      const run = focusWord("見る");
      press(run, "ArrowLeft");
      fireEvent.click(run, { detail: 0 });
      expect(actionsIn(gestures)).toEqual(["click 見る"]);
    });

    it("starts from the first character again once focus has left", () => {
      const gestures = renderSentence("映画を見る");
      const run = focusWord("映画を見る");
      press(run, "ArrowRight", 3);
      fireEvent.blur(run);
      fireEvent.focus(run);
      fireEvent.click(run, { detail: 0 });
      expect(actionsIn(gestures)).toEqual(["click 映画を見る"]);
    });

    it("moves focus to the next word written with spaces on Right", () => {
      renderSentence();
      press(focusWord("Ich"), "ArrowRight");
      expect(document.activeElement).toBe(word("rufe"));
    });

    it("moves on from the last character of a run to the next word", () => {
      renderSentence("見る、Netflix");
      press(focusWord("見る"), "ArrowRight", 2);
      expect(document.activeElement).toBe(word("Netflix"));
    });

    it("looks the word it moves to up at once, as a mouse resting on it would", () => {
      const gestures = renderSentence();
      press(focusWord("Ich"), "ArrowRight");
      expect(gestures).toContain("hover rufe");
    });

    it("points at the same place as the mouse on the same character", () => {
      const pointed: string[] = [];
      render(
        <ClickableText
          text="映画を見る"
          gestures={{
            onWordPointed: (hit) => {
              if (hit) pointed.push(`${hit.word} at ${hit.start}`);
            },
          }}
        />,
      );
      layOutCharacters();
      const run = word("映画を見る");
      fireEvent.pointerEnter(run, {
        pointerType: "mouse",
        clientX: 50,
        clientY: 10,
      });
      fireEvent.pointerLeave(run, { pointerType: "mouse" });
      press(focusWord("映画を見る"), "ArrowRight", 3);
      vi.restoreAllMocks();
      expect(pointed.at(-1)).toBe(pointed[0]);
    });

    it("takes the arrow keys from the page's own shortcuts", () => {
      renderSentence();
      const event = new KeyboardEvent("keydown", {
        key: "ArrowRight",
        bubbles: true,
        cancelable: true,
      });
      word("rufe").dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    });

    it("takes Shift with an arrow from the page's own shortcuts", () => {
      renderSentence();
      const event = new KeyboardEvent("keydown", {
        key: "ArrowRight",
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      });
      word("rufe").dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    });
  });

  describe("on a touch screen", () => {
    it("looks nothing up from the start of a run when a tap focuses it after the finger lifts", () => {
      const gestures = renderSentence("映画を見る");
      const run = word("映画を見る");
      fireEvent.pointerDown(run, { pointerType: "touch" });
      fireEvent.pointerUp(run, { pointerType: "touch" });
      fireEvent.focus(run);
      expect(gestures).toEqual([]);
    });

    it("lets a later keyboard focus point at the word once a touch was cancelled", () => {
      const gestures = renderSentence("映画を見る");
      const run = word("映画を見る");
      fireEvent.pointerDown(run, { pointerType: "touch" });
      fireEvent.pointerCancel(run, { pointerType: "touch" });
      fireEvent.focus(run);
      expect(gestures).toContain("hover 映画を見る");
    });

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
