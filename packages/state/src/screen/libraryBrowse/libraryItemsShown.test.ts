import { describe, expect, it } from "vitest";
import { exampleLibraryItem } from "./exampleLibraryItem.ts";
import { libraryItemsShown } from "./libraryItemsShown.ts";

const items = [
  exampleLibraryItem({ id: "de-news", language: "de", tags: ["news"] }),
  exampleLibraryItem({ id: "de-film", language: "de", tags: ["film", "news"] }),
  exampleLibraryItem({ id: "ja-news", language: "ja", tags: ["news"] }),
];

const idsShown = (language: string | null, tags: string[]) =>
  libraryItemsShown(items, { language, tags }).map(({ id }) => id);

describe("libraryItemsShown", () => {
  it("keeps every item when the filter chooses nothing", () => {
    expect(idsShown(null, [])).toEqual(["de-news", "de-film", "ja-news"]);
  });

  it("keeps the items in the chosen language", () => {
    expect(idsShown("ja", [])).toEqual(["ja-news"]);
  });

  it("keeps the items that carry every chosen tag", () => {
    expect(idsShown(null, ["news", "film"])).toEqual(["de-film"]);
  });

  it("keeps the items in the chosen language that carry the chosen tags", () => {
    expect(idsShown("de", ["news"])).toEqual(["de-news", "de-film"]);
  });
});
