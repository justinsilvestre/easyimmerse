import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ClickableText,
  splitIntoWords,
  stripMarkup,
} from "./ClickableText.tsx";

afterEach(cleanup);

describe("splitIntoWords", () => {
  it("keeps the punctuation and spaces between words", () => {
    expect(
      splitIntoWords("Der Hund, er hat Hunger.").map((part) => part.text),
    ).toEqual(["Der", " ", "Hund", ", ", "er", " ", "hat", " ", "Hunger", "."]);
  });

  it("marks only the words", () => {
    expect(splitIntoWords("Hund.").map((part) => part.isWord)).toEqual([
      true,
      false,
    ]);
  });

  it("keeps a run of Japanese apart from a Latin word inside it", () => {
    expect(
      splitIntoWords("今日はNetflixで映画を見る")
        .filter((part) => part.isWord)
        .map((part) => part.text),
    ).toEqual(["今日は", "Netflix", "で映画を見る"]);
  });

  it("keeps Japanese punctuation out of a run", () => {
    expect(
      splitIntoWords("食べる、飲む。")
        .filter((part) => part.isWord)
        .map((part) => part.text),
    ).toEqual(["食べる", "飲む"]);
  });

  it("keeps a character outside the Basic Multilingual Plane in its run", () => {
    expect(splitIntoWords("𠮷野家で")[0]?.text).toBe("𠮷野家で");
  });

  it("keeps a run that begins with fullwidth digits together", () => {
    expect(splitIntoWords("３人で")[0]?.text).toBe("３人で");
  });

  it("keeps a run that begins with ASCII digits together", () => {
    expect(splitIntoWords("2026年")[0]?.text).toBe("2026年");
  });

  it("keeps the ideographic zero inside a run", () => {
    expect(splitIntoWords("二〇二六年")[0]?.text).toBe("二〇二六年");
  });

  it("keeps the spacing voicing marks inside a run", () => {
    expect(splitIntoWords("か゛き゜")[0]?.text).toBe("か゛き゜");
  });

  it("marks a run of Bopomofo as written without spaces", () => {
    expect(splitIntoWords("ㄅㄆㄇ")[0]?.isUnspaced).toBe(true);
  });

  it("marks a run of Thai as written without spaces", () => {
    expect(splitIntoWords("กินข้าว")[0]?.isUnspaced).toBe(true);
  });

  it("keeps Thai vowel signs and tone marks inside a run", () => {
    expect(splitIntoWords("กินข้าว")[0]?.text).toBe("กินข้าว");
  });

  it("leaves digits that stand alone out of the words", () => {
    expect(
      splitIntoWords("Seite 12")
        .filter((part) => part.isWord)
        .map((part) => part.text),
    ).toEqual(["Seite"]);
  });

  it("marks a Japanese run as written without spaces", () => {
    expect(
      splitIntoWords("映画Netflix").map((part) => part.isUnspaced),
    ).toEqual([true, false]);
  });

  it("keeps an apostrophe inside a word", () => {
    expect(splitIntoWords("l'homme")[0]?.text).toBe("l'homme");
  });
});

describe("stripMarkup", () => {
  it("removes subtitle tags", () => {
    expect(stripMarkup("<i>Everything</i> is quiet.")).toBe(
      "Everything is quiet.",
    );
  });
});

describe("ClickableText", () => {
  it("renders angle-bracketed text as it is", () => {
    const { container } = render(<ClickableText text="<colloq.> mate" />);
    expect(container.textContent).toBe("<colloq.> mate");
  });

  it("marks the word the pop-up shows as expanded", () => {
    render(
      <ClickableText
        text="Ich rufe an."
        activeWord={{ start: 4, popupId: "dictionary" }}
      />,
    );
    expect(
      screen
        .getByRole("button", { name: "rufe" })
        .getAttribute("aria-expanded"),
    ).toBe("true");
  });

  it("names the pop-up that the word the pop-up shows controls", () => {
    render(
      <ClickableText
        text="Ich rufe an."
        activeWord={{ start: 4, popupId: "dictionary" }}
      />,
    );
    expect(
      screen
        .getByRole("button", { name: "rufe" })
        .getAttribute("aria-controls"),
    ).toBe("dictionary");
  });

  it("does not highlight a word written with spaces before its lookup answers", () => {
    render(
      <ClickableText
        text="Ich rufe an."
        gestures={{ onWordHover: () => new Promise(() => undefined) }}
      />,
    );
    const word = screen.getByRole("button", { name: "rufe" });
    fireEvent.pointerEnter(word, { pointerType: "mouse" });
    expect(word.classList.contains("bg-accent-soft")).toBe(false);
  });

  it("highlights a word written with spaces once its lookup answers", async () => {
    render(
      <ClickableText
        text="Ich rufe an."
        gestures={{ onWordHover: () => Promise.resolve(4) }}
      />,
    );
    const word = screen.getByRole("button", { name: "rufe" });
    fireEvent.pointerEnter(word, { pointerType: "mouse" });
    await vi.waitUntil(() => word.classList.contains("bg-accent-soft"));
    expect(word.classList.contains("bg-accent-soft")).toBe(true);
  });

  it("highlights a word written with spaces at once when nothing is looked up", () => {
    render(<ClickableText text="Ich rufe an." />);
    const word = screen.getByRole("button", { name: "rufe" });
    fireEvent.pointerEnter(word, { pointerType: "mouse" });
    expect(word.classList.contains("bg-accent-soft")).toBe(true);
  });

  describe("with words that flashcards were made from", () => {
    it("marks such a word", () => {
      const { container } = render(
        <ClickableText
          text="Der Hund will fressen."
          markedRanges={[{ from: 4, to: 8 }]}
        />,
      );
      expect(
        container.querySelector("[data-flashcard-word]")?.textContent,
      ).toBe("Hund");
    });

    it("tells that a marked word has a flashcard", () => {
      render(
        <ClickableText
          text="Der Hund will fressen."
          markedRanges={[{ from: 4, to: 8 }]}
        />,
      );
      expect(
        screen.getByRole("button", { name: "Hund" }).getAttribute("title"),
      ).toBe("Has a flashcard");
    });

    it("leaves the other words unmarked", () => {
      render(
        <ClickableText
          text="Der Hund will fressen."
          markedRanges={[{ from: 4, to: 8 }]}
        />,
      );
      expect(
        screen
          .getByRole("button", { name: "Der" })
          .querySelector("[data-flashcard-word]"),
      ).toBeNull();
    });

    it("marks each word of a marked phrase", () => {
      const { container } = render(
        <ClickableText
          text="Der Hund will fressen."
          markedRanges={[{ from: 4, to: 13 }]}
        />,
      );
      expect(
        [...container.querySelectorAll("[data-flashcard-word]")].map(
          (word) => word.textContent,
        ),
      ).toEqual(["Hund", "will"]);
    });

    it("marks only the characters of a run of Japanese that the flashcard was made from", () => {
      const { container } = render(
        <ClickableText text="映画を見る" markedRanges={[{ from: 0, to: 2 }]} />,
      );
      expect(
        container.querySelector("[data-flashcard-word]")?.textContent,
      ).toBe("映画");
    });

    it("tells that a run holding a marked word has a flashcard", () => {
      render(
        <ClickableText text="映画を見る" markedRanges={[{ from: 0, to: 2 }]} />,
      );
      expect(screen.getByRole("button").getAttribute("title")).toBe(
        "Has a flashcard",
      );
    });
  });

  describe("in a run of Japanese", () => {
    beforeEach(() => vi.useFakeTimers());

    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    const matchedText = (container: HTMLElement) =>
      container.querySelector("[data-matched]")?.textContent;

    const hoveredText = (container: HTMLElement) =>
      container.querySelector("[data-hovered]")?.textContent;

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

    it("highlights the characters the lookup matched", () => {
      const { container } = render(
        <ClickableText
          text="映画を見る"
          activeWord={{ start: 3, length: 2, popupId: "dictionary" }}
        />,
      );
      expect(matchedText(container)).toBe("見る");
    });

    it("leaves the pop-up's word unhighlighted until its lookup answers", () => {
      const { container } = render(
        <ClickableText
          text="映画を見る"
          activeWord={{ start: 3, popupId: "dictionary" }}
        />,
      );
      expect(matchedText(container)).toBeUndefined();
    });

    it("highlights the character looked up from when the lookup matched nothing", () => {
      const { container } = render(
        <ClickableText
          text="映画を見る"
          activeWord={{ start: 3, length: null, popupId: "dictionary" }}
        />,
      );
      expect(matchedText(container)).toBe("見");
    });

    it("highlights a whole character outside the Basic Multilingual Plane", () => {
      const { container } = render(
        <ClickableText
          text="𠮷野家"
          activeWord={{ start: 0, length: null, popupId: "dictionary" }}
        />,
      );
      expect(matchedText(container)).toBe("𠮷");
    });

    it("highlights a Thai letter with its vowel sign when the lookup matched nothing", () => {
      const { container } = render(
        <ClickableText
          text="กินข้าว"
          activeWord={{ start: 0, length: null, popupId: "dictionary" }}
        />,
      );
      expect(matchedText(container)).toBe("กิ");
    });

    it("highlights the digits a run begins with when the lookup matched nothing", () => {
      const { container } = render(
        <ClickableText
          text="2026年"
          activeWord={{ start: 0, length: null, popupId: "dictionary" }}
        />,
      );
      expect(matchedText(container)).toBe("2026");
    });

    /** Rests the mouse, for a hover whose lookup matches nothing, on the character of the text at the index, until the answer. */
    async function hoverCharacter(text: string, index: number) {
      const rendered = render(
        <ClickableText
          text={text}
          gestures={{ onWordHover: () => Promise.resolve(null) }}
        />,
      );
      layOutCharacters();
      fireEvent.pointerEnter(screen.getByRole("button"), {
        pointerType: "mouse",
        clientX: index * 16 + 4,
        clientY: 10,
      });
      await act(() => vi.advanceTimersByTimeAsync(40));
      return rendered;
    }

    it("hovers the letter that a Thai vowel sign under the mouse belongs to", async () => {
      const { container } = await hoverCharacter("กินข้าว", 1);
      expect(hoveredText(container)).toBe("กิ");
    });

    it("hovers the digits that a digit under the mouse belongs to", async () => {
      const { container } = await hoverCharacter("2026年", 2);
      expect(hoveredText(container)).toBe("2026");
    });

    /** Renders a run whose hover lookups answer with the given length, and rests the mouse on 見 until the answer. */
    async function hoverAnswering(length: number | null) {
      const rendered = render(
        <ClickableText
          text="映画を見る"
          gestures={{ onWordHover: () => Promise.resolve(length) }}
        />,
      );
      layOutCharacters();
      fireEvent.pointerEnter(screen.getByRole("button"), {
        pointerType: "mouse",
        clientX: 50,
        clientY: 10,
      });
      await act(() => vi.advanceTimersByTimeAsync(40));
      return rendered;
    }

    it("highlights nothing before the hover's lookup answers", () => {
      const { container } = render(
        <ClickableText
          text="映画を見る"
          gestures={{ onWordHover: () => new Promise(() => undefined) }}
        />,
      );
      layOutCharacters();
      fireEvent.pointerEnter(screen.getByRole("button"), {
        pointerType: "mouse",
        clientX: 50,
        clientY: 10,
      });
      expect(hoveredText(container)).toBeUndefined();
    });

    it("highlights the text that the hover's lookup matched, within 40 ms", async () => {
      const { container } = await hoverAnswering(2);
      expect(hoveredText(container)).toBe("見る");
    });

    it("highlights the character under the mouse when the lookup matched nothing", async () => {
      const { container } = await hoverAnswering(null);
      expect(hoveredText(container)).toBe("見");
    });

    it("highlights the character under the mouse once it rests there, when nothing is looked up", () => {
      const { container } = render(<ClickableText text="映画を見る" />);
      layOutCharacters();
      fireEvent.pointerEnter(screen.getByRole("button"), {
        pointerType: "mouse",
        clientX: 50,
        clientY: 10,
      });
      act(() => vi.advanceTimersByTime(40));
      expect(hoveredText(container)).toBe("見");
    });

    it("keeps the highlight while the mouse moves within the matched text", async () => {
      const { container } = await hoverAnswering(2);
      fireEvent.pointerMove(screen.getByRole("button"), {
        pointerType: "mouse",
        clientX: 70,
        clientY: 10,
      });
      expect(hoveredText(container)).toBe("見る");
    });

    it("drops the highlight at once when the mouse moves beyond the matched text", async () => {
      const { container } = await hoverAnswering(2);
      fireEvent.pointerMove(screen.getByRole("button"), {
        pointerType: "mouse",
        clientX: 5,
        clientY: 10,
      });
      expect(hoveredText(container)).toBeUndefined();
    });

    it("ignores a lookup's answer for a character the mouse has left", async () => {
      let answer: (length: number) => void = () => undefined;
      const { container } = render(
        <ClickableText
          text="映画を見る"
          gestures={{
            onWordHover: (hit) =>
              hit.start === 3
                ? new Promise((resolve) => {
                    answer = resolve;
                  })
                : Promise.resolve(null),
          }}
        />,
      );
      layOutCharacters();
      const run = screen.getByRole("button");
      fireEvent.pointerEnter(run, {
        pointerType: "mouse",
        clientX: 50,
        clientY: 10,
      });
      await act(() => vi.advanceTimersByTimeAsync(40));
      fireEvent.pointerMove(run, {
        pointerType: "mouse",
        clientX: 5,
        clientY: 10,
      });
      await act(() => vi.advanceTimersByTimeAsync(40));
      await act(async () => answer(2));
      expect(hoveredText(container)).toBe("映");
    });

    it("drops the highlight once the mouse leaves", async () => {
      await hoverAnswering(2);
      fireEvent.pointerLeave(screen.getByRole("button"), {
        pointerType: "mouse",
      });
      expect(hoveredText(document.body)).toBeUndefined();
    });

    it("keeps the run one button for assistive technology", () => {
      render(
        <ClickableText
          text="映画を見る"
          activeWord={{ start: 3, length: 2, popupId: "dictionary" }}
        />,
      );
      expect(
        screen
          .getByRole("button", { name: "映画を見る" })
          .getAttribute("aria-expanded"),
      ).toBe("true");
    });
  });

  describe("with the keyboard in a run of Japanese", () => {
    function focusAndMoveRight(times: number) {
      const { container } = render(<ClickableText text="映画を見る" />);
      const run = screen.getByRole("button", { name: "映画を見る" });
      fireEvent.focus(run);
      for (let count = 0; count < times; count += 1)
        fireEvent.keyDown(run, { key: "ArrowRight" });
      return container;
    }

    it("highlights the character a lookup would start from, as the mouse's highlight does", () => {
      const container = focusAndMoveRight(3);
      expect(container.querySelector("[data-hovered]")?.textContent).toBe("見");
    });

    it("announces the character a lookup would start from", () => {
      focusAndMoveRight(3);
      expect(screen.getByText("Looks up from 見")).toBeDefined();
    });

    it("announces from outside the run's button", () => {
      focusAndMoveRight(3);
      expect(screen.getByText("Looks up from 見").closest("button")).toBeNull();
    });

    it("keeps its announcing region on the page before any key is pressed", () => {
      const { container } = render(<ClickableText text="映画を見る" />);
      expect(container.querySelector("[aria-live]")).not.toBeNull();
    });

    it("tells assistive technology that Left and Right work in a run, with Shift too", () => {
      render(<ClickableText text="映画を見る" />);
      expect(
        screen
          .getByRole("button", { name: "映画を見る" })
          .getAttribute("aria-keyshortcuts"),
      ).toBe("ArrowLeft ArrowRight Shift+ArrowLeft Shift+ArrowRight");
    });

    describe("whose lookups match words", () => {
      /** The lengths a dictionary would match from each offset of 映画を見るよ: 映画 / を / 見る / よ. */
      const lengths: Record<number, number> = { 0: 2, 2: 1, 3: 2, 5: 1 };

      /** Lets the lookups started so far answer, and the text take in their answers. */
      const settle = () =>
        act(() => new Promise((resolve) => setTimeout(resolve, 0)));

      /** Focuses the run of 映画を見るよ, whose lookups answer at once, and presses keys, letting the lookups answer after each. */
      async function focusAndPress(
        ...keys: { key: string; shiftKey?: boolean }[]
      ) {
        const { container } = render(
          <ClickableText
            text="映画を見るよ"
            gestures={{
              onWordHover: (hit) => Promise.resolve(lengths[hit.start] ?? null),
            }}
          />,
        );
        const run = screen.getByRole("button", { name: "映画を見るよ" });
        fireEvent.focus(run);
        await settle();
        for (const key of keys) {
          fireEvent.keyDown(run, key);
          await settle();
        }
        return container;
      }

      const right = { key: "ArrowRight" };
      const left = { key: "ArrowLeft" };

      it("moves past the text the lookup matched with Right", async () => {
        const container = await focusAndPress(right);
        expect(container.querySelector("[data-hovered]")?.textContent).toBe(
          "を",
        );
      });

      it("moves back over the word before the cursor with Left", async () => {
        const container = await focusAndPress(right, right, right, left);
        expect(container.querySelector("[data-hovered]")?.textContent).toBe(
          "見る",
        );
      });

      it("moves one character with Shift and Right", async () => {
        const container = await focusAndPress({
          key: "ArrowRight",
          shiftKey: true,
        });
        expect(container.querySelector("[data-hovered]")?.textContent).toBe(
          "画",
        );
      });
    });

    it("starts from the first character of a run whose text changed under focus", () => {
      const clicks: string[] = [];
      const gestures = {
        onWordClick: (hit: { word: string }) => clicks.push(hit.word),
      };
      const { rerender } = render(
        <ClickableText text="映画を見る" gestures={gestures} />,
      );
      const run = screen.getByRole("button", { name: "映画を見る" });
      fireEvent.focus(run);
      for (let count = 0; count < 4; count += 1)
        fireEvent.keyDown(run, { key: "ArrowRight" });
      rerender(<ClickableText text="今日は" gestures={gestures} />);
      fireEvent.click(screen.getByRole("button", { name: "今日は" }), {
        detail: 0,
      });
      expect(clicks).toEqual(["今日は"]);
    });

    it("forgets the cursor once the text has changed", () => {
      const { container, rerender } = render(
        <ClickableText text="映画を見る" />,
      );
      const run = screen.getByRole("button", { name: "映画を見る" });
      fireEvent.focus(run);
      fireEvent.keyDown(run, { key: "ArrowRight" });
      rerender(<ClickableText text="Hund" />);
      rerender(<ClickableText text="映画を見る" />);
      expect(container.querySelector("[data-hovered]")).toBeNull();
    });

    it("highlights the cursor it is given rather than one of its own", () => {
      const { container } = render(
        <ClickableText
          text="映画を見る"
          cursor={{ start: 3, input: "keyboard", matchedLength: 2 }}
        />,
      );
      expect(container.querySelector("[data-hovered]")?.textContent).toBe(
        "見る",
      );
    });

    it("highlights nothing for a cursor it is given before its lookup answers", () => {
      const { container } = render(
        <ClickableText
          text="映画を見る"
          cursor={{ start: 3, input: "keyboard" }}
        />,
      );
      expect(container.querySelector("[data-hovered]")).toBeNull();
    });

    it("highlights the character of a cursor it is given whose lookup matched nothing", () => {
      const { container } = render(
        <ClickableText
          text="映画を見る"
          cursor={{ start: 3, input: "keyboard", matchedLength: null }}
        />,
      );
      expect(container.querySelector("[data-hovered]")?.textContent).toBe("見");
    });

    it("leaves the pop-up's word unhighlighted while the cursor lies elsewhere in the text", () => {
      const { container } = render(
        <ClickableText
          text="映画を見る"
          activeWord={{ start: 0, length: 2, popupId: "dictionary" }}
          cursor={{ start: 3, input: "mouse" }}
        />,
      );
      expect(container.querySelector("[data-matched]")).toBeNull();
    });

    it("leaves the pop-up's word unhighlighted when told the cursor lies in another text", () => {
      const { container } = render(
        <ClickableText
          text="映画を見る"
          activeWord={{
            start: 0,
            length: 2,
            popupId: "dictionary",
            isHighlighted: false,
          }}
          cursor={null}
        />,
      );
      expect(container.querySelector("[data-matched]")).toBeNull();
    });

    it("keeps the run's name whole while a character is marked", () => {
      focusAndMoveRight(3);
      expect(screen.getByRole("button", { name: "映画を見る" })).toBeDefined();
    });
  });

  it("passes a clicked word's offset in the text", () => {
    const clicks: [string, number][] = [];
    render(
      <ClickableText
        text="Ich rufe an."
        gestures={{ onWordClick: (hit) => clicks.push([hit.word, hit.start]) }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "rufe" }));
    expect(clicks).toEqual([["rufe", 4]]);
  });
});
