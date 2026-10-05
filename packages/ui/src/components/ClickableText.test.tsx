import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
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
    const matchedText = (container: HTMLElement) =>
      container.querySelector("[data-matched]")?.textContent;

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
