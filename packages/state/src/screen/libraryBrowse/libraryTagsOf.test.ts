import { describe, expect, it } from "vitest";
import { exampleLibraryItem } from "./exampleLibraryItem.ts";
import { libraryTagsOf } from "./libraryTagsOf.ts";

describe("libraryTagsOf", () => {
  it("lists every tag of the items once, in alphabetical order", () => {
    const items = [
      exampleLibraryItem({ tags: ["news", "film"] }),
      exampleLibraryItem({ tags: ["news", "children"] }),
    ];
    expect(libraryTagsOf(items)).toEqual(["children", "film", "news"]);
  });
});
