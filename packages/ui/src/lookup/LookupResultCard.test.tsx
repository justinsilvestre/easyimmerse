import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  exampleInflectedResult,
  examplePronunciationResult,
} from "./exampleJapaneseLookup.ts";
import { LookupResultCard } from "./LookupResultCard.tsx";

afterEach(cleanup);

function renderCard(
  result = exampleInflectedResult,
  onWordClick: (word: string) => void = () => undefined,
) {
  return render(
    <LookupResultCard
      result={result}
      resolveMediaUrl={() => null}
      onWordClick={onWordClick}
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

  it("shows a tag's notes as its tooltip", () => {
    renderCard();
    expect(screen.getByText("vt").getAttribute("title")).toBe(
      "Transitive verb",
    );
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

  it("passes words clicked in a definition on", () => {
    const clicked: string[] = [];
    renderCard(exampleInflectedResult, (word) => clicked.push(word));
    fireEvent.click(screen.getByRole("button", { name: "subsist" }));
    expect(clicked).toEqual(["subsist"]);
  });
});
