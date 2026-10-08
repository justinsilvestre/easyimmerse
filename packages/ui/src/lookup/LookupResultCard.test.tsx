import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { doubleClick } from "../testSupport/doubleClick.ts";
import {
  exampleAmbiguousInflectionResult,
  exampleInflectedResult,
  examplePronunciationResult,
} from "./exampleJapaneseLookup.ts";
import { LookupResultCard } from "./LookupResultCard.tsx";

afterEach(cleanup);

function renderCard(
  result = exampleInflectedResult,
  onWordLookup: (word: string) => void = () => undefined,
) {
  return render(
    <LookupResultCard
      result={result}
      resolveMediaUrl={() => null}
      onWordLookup={onWordLookup}
      onLookup={() => undefined}
      onCreateFlashcard={() => undefined}
    />,
  );
}

describe("LookupResultCard", () => {
  it("shows the reading over the kanji of the term", () => {
    const { container } = renderCard();
    expect(container.querySelector("header rt")?.textContent).toBe("た");
  });

  it("shows the looked-up text when it differs from the term", () => {
    renderCard();
    expect(screen.getByText("from 食べなかった")).toBeDefined();
  });

  it("shows the inflections from the dictionary form outwards", () => {
    renderCard();
    expect(screen.getByText("negative ‹ past")).toBeDefined();
  });

  it("shows a single inflection chain on one line", () => {
    renderCard();
    expect(screen.getAllByText(/‹/)).toHaveLength(1);
  });

  it("shows equally good chains that differ in one step as alternatives on one line", () => {
    renderCard(exampleAmbiguousInflectionResult);
    expect(
      screen.getByText("causative ‹ passive or potential ‹ negative ‹ past"),
    ).toBeDefined();
  });

  it("shows a tag's notes as its tooltip", () => {
    renderCard();
    expect(
      screen.getByText("vt").closest("[title]")?.getAttribute("title"),
    ).toBe("Transitive verb");
  });

  it("gives a term tag Yomitan's tag class", () => {
    renderCard();
    expect(screen.getByText("★").closest(".dict-tag")).not.toBeNull();
  });

  it("shows each frequency with its dictionary", () => {
    renderCard();
    expect(screen.getByText("JPDB: 512")).toBeDefined();
  });

  it("prefers a frequency's display text to its value", () => {
    renderCard(examplePronunciationResult);
    expect(screen.getByText("BCCWJ: 1210㋕")).toBeDefined();
  });

  it("shows an IPA transcription", () => {
    renderCard(examplePronunciationResult);
    expect(screen.getByText("[ɡa̠kɯ̟̊se̞ː]")).toBeDefined();
  });

  it("labels each dictionary's definitions with its title", () => {
    renderCard();
    expect(screen.getByRole("region", { name: "Jitendex" })).toBeDefined();
  });

  it("passes words double-clicked in a definition on", () => {
    const looked: string[] = [];
    renderCard(exampleInflectedResult, (word) => looked.push(word));
    doubleClick(screen.getByRole("button", { name: "subsist" }));
    expect(looked).toEqual(["subsist"]);
  });
});
