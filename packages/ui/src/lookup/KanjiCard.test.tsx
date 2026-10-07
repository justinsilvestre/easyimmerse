import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { exampleKanjiResult } from "./exampleJapaneseLookup.ts";
import { KanjiCard } from "./KanjiCard.tsx";

afterEach(cleanup);

function renderCard() {
  return render(
    <KanjiCard result={exampleKanjiResult} onWordLookup={() => undefined} />,
  );
}

describe("KanjiCard", () => {
  it("labels a stat with the notes of its tag", () => {
    renderCard();
    expect(screen.getByText("Stroke count").nextSibling?.textContent).toBe("9");
  });

  it("orders stats by their tags' order", () => {
    const { container } = renderCard();
    expect(
      [...container.querySelectorAll("dt")].map((term) => term.textContent),
    ).toEqual([
      "Stroke count",
      "School grade",
      "Newspaper frequency rank",
      "Remembering the Kanji, 6th edition",
    ]);
  });

  it("shows the on readings", () => {
    renderCard();
    expect(screen.getByText("On").parentElement?.textContent).toBe(
      "Onショク、ジキ",
    );
  });
});
