import { describe, expect, it } from "vitest";
import { actions } from "../../app/appAction.ts";
import { stateAfter } from "../../app/stateAfter.ts";
import { selectLibraryBrowseFilter } from "./libraryBrowseFilter.ts";

const filterAfter = (...done: Parameters<typeof stateAfter>) =>
  selectLibraryBrowseFilter({ app: stateAfter(...done) });

const openLibrary = actions.navigated({ type: "openLibrary" });

describe("the library browse filter", () => {
  it("shows every item at first", () => {
    expect(filterAfter(openLibrary)).toEqual({ language: null, tags: [] });
  });

  it("takes the chosen language", () => {
    expect(
      filterAfter(openLibrary, actions.libraryLanguageChosen("de")).language,
    ).toBe("de");
  });

  it("turns a tag on", () => {
    expect(
      filterAfter(openLibrary, actions.libraryTagToggled("news")).tags,
    ).toEqual(["news"]);
  });

  it("turns a tag off again", () => {
    expect(
      filterAfter(
        openLibrary,
        actions.libraryTagToggled("news"),
        actions.libraryTagToggled("news"),
      ).tags,
    ).toEqual([]);
  });

  it("is kept when the library opens again after an item", () => {
    expect(
      filterAfter(
        openLibrary,
        actions.libraryLanguageChosen("de"),
        actions.navigated({ type: "openLibraryItem", itemId: "i1" }),
        openLibrary,
      ).language,
    ).toBe("de");
  });
});
