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
