import type { Definition } from "@easyimmerse/types";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DictionaryDefinitionsSection } from "./DictionaryDefinitionsSection.tsx";
import { exampleTermEntry } from "./exampleTermEntry.ts";

afterEach(cleanup);

const structured: Definition = {
  kind: "structured",
  content: { tag: "span", content: "book" },
};

function renderSection(definitions: Definition[] = [structured]) {
  return render(
    <DictionaryDefinitionsSection
      dictionaryDefinitions={{
        dictionaryId: "d1",
        dictionaryTitle: "Sample",
        entry: exampleTermEntry({
          term: "本",
          definitions,
          definitionTags: ["n"],
        }),
        tags: [
          {
            name: "n",
            category: "partOfSpeech",
            order: 0,
            notes: "noun",
            score: 0,
          },
        ],
      }}
      resolveMediaUrl={() => null}
      onWordClick={() => undefined}
      onLookup={() => undefined}
    />,
  );
}

describe("DictionaryDefinitionsSection", () => {
  it("puts the title, tags and definitions in the dictionary's scope", () => {
    const { container } = renderSection();
    expect(
      container.querySelector('[data-dictionary-scope="d1"] .dict-tag'),
    ).not.toBeNull();
  });

  it("lists each definition as an item of Yomitan's gloss list", () => {
    const { container } = renderSection([structured, structured]);
    expect(
      container.querySelectorAll(".dict-gloss-list > li.dict-gloss-item"),
    ).toHaveLength(2);
  });

  it("puts each definition in Yomitan's gloss content", () => {
    const { container } = renderSection();
    expect(
      container.querySelector(".dict-gloss-item > .dict-gloss-content")
        ?.textContent,
    ).toBe("book");
  });

  it("marks structured content as Yomitan does", () => {
    const { container } = renderSection();
    expect(
      container.querySelector(".dict-gloss-content > .dict-structured-content"),
    ).not.toBeNull();
  });

  it("hides the separator before each definition, as Yomitan does outside its compact mode", () => {
    const { container } = renderSection();
    expect(
      container.querySelector(".dict-gloss-separator")?.className,
    ).toContain("hidden");
  });

  it("marks the dictionary's title as Yomitan's dictionary tag", () => {
    renderSection();
    expect(
      screen
        .getByText("Sample")
        .closest(".dict-tag")
        ?.getAttribute("data-category"),
    ).toBe("dictionary");
  });

  it("gives a definition tag Yomitan's tag elements and its category", () => {
    const { container } = renderSection();
    expect(
      container.querySelector(
        '.dict-tag[data-category="partOfSpeech"] > .dict-tag-label > .dict-tag-label-content',
      )?.textContent,
    ).toBe("n");
  });
});
