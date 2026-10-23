import { describe, expect, it } from "vitest";
import { exampleLibraryItem } from "./exampleLibraryItem.ts";
import { libraryLanguagesOf } from "./libraryLanguagesOf.ts";

describe("libraryLanguagesOf", () => {
  it("lists the language of every item once, in alphabetical order", () => {
    const items = [
      exampleLibraryItem({ language: "ja" }),
      exampleLibraryItem({ language: "de" }),
      exampleLibraryItem({ language: "ja" }),
    ];
    expect(libraryLanguagesOf(items)).toEqual(["de", "ja"]);
  });
});
