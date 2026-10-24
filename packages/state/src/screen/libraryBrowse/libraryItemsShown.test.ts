import { describe, expect, it } from "vitest";
import { exampleLibraryItem } from "./exampleLibraryItem.ts";
import { libraryItemsShown } from "./libraryItemsShown.ts";

const items = [
  exampleLibraryItem({ id: "news", tags: ["news"] }),
  exampleLibraryItem({ id: "film-news", tags: ["film", "news"] }),
  exampleLibraryItem({ id: "film", tags: ["film"] }),
];

const idsShown = (tags: string[]) =>
  libraryItemsShown(items, { tags }).map(({ id }) => id);

describe("libraryItemsShown", () => {
  it("keeps every item when the filter chooses no tag", () => {
    expect(idsShown([])).toEqual(["news", "film-news", "film"]);
  });

  it("keeps the items that carry every chosen tag", () => {
    expect(idsShown(["news", "film"])).toEqual(["film-news"]);
  });
});
