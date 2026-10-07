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

    it("highlights the character looked up from until the lookup reports its match", () => {
      const { container } = render(
        <ClickableText
          text="映画を見る"
          activeWord={{ start: 3, popupId: "dictionary" }}
        />,
      );
      expect(matchedText(container)).toBe("見");
    });

    it("highlights a whole character outside the Basic Multilingual Plane", () => {
      const { container } = render(
        <ClickableText
          text="𠮷野家"
          activeWord={{ start: 0, popupId: "dictionary" }}
        />,
      );
      expect(matchedText(container)).toBe("𠮷");
    });

    it("highlights the character under the mouse", () => {
      const { container } = render(<ClickableText text="映画を見る" />);
      layOutCharacters();
      fireEvent.pointerEnter(screen.getByRole("button"), {
        pointerType: "mouse",
        clientX: 50,
        clientY: 10,
      });
      expect(hoveredText(container)).toBe("見");
    });

    it("grows the highlight to the text that hover intent matched", async () => {
      const { container } = render(
        <ClickableText
          text="映画を見る"
          gestures={{ onWordHoverIntent: () => Promise.resolve(2) }}
        />,
      );
      layOutCharacters();
      fireEvent.pointerEnter(screen.getByRole("button"), {
        pointerType: "mouse",
        clientX: 50,
        clientY: 10,
      });
      await act(() => vi.advanceTimersByTimeAsync(200));
      expect(hoveredText(container)).toBe("見る");
    });

    it("drops the highlight once the mouse leaves", () => {
      const { container } = render(<ClickableText text="映画を見る" />);
      layOutCharacters();
      const run = screen.getByRole("button");
      fireEvent.pointerEnter(run, {
        pointerType: "mouse",
        clientX: 50,
        clientY: 10,
      });
      fireEvent.pointerLeave(run, { pointerType: "mouse" });
      expect(hoveredText(container)).toBeUndefined();
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

    it("marks the character a lookup would start from", () => {
      const container = focusAndMoveRight(3);
      expect(
        container.querySelector("[data-keyboard-start]")?.textContent,
      ).toBe("見");
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

    it("tells assistive technology that Left and Right work in a run", () => {
      render(<ClickableText text="映画を見る" />);
      expect(
        screen
          .getByRole("button", { name: "映画を見る" })
          .getAttribute("aria-keyshortcuts"),
      ).toBe("ArrowLeft ArrowRight");
    });

    it("ignores Shift with Right, which belongs to text selection", () => {
      const clicks: string[] = [];
      render(
        <ClickableText
          text="映画を見る"
          gestures={{ onWordClick: (hit) => clicks.push(hit.word) }}
        />,
      );
      const run = screen.getByRole("button", { name: "映画を見る" });
      fireEvent.focus(run);
      fireEvent.keyDown(run, { key: "ArrowRight", shiftKey: true });
      fireEvent.click(run, { detail: 0 });
      expect(clicks).toEqual(["映画を見る"]);
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

    it("forgets the start once the run's button is gone", () => {
      const { container, rerender } = render(
        <ClickableText text="映画を見る" />,
      );
      const run = screen.getByRole("button", { name: "映画を見る" });
      fireEvent.focus(run);
      fireEvent.keyDown(run, { key: "ArrowRight" });
      rerender(<ClickableText text="Hund" />);
      rerender(<ClickableText text="映画を見る" />);
      expect(container.querySelector("[data-keyboard-start]")).toBeNull();
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
