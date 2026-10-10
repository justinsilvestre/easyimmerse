import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import { stateAfter } from "../app/stateAfter.ts";
import { selectIsReadingLocationLoaded } from "./storedPlacesSelectors.ts";

const location = { chapterIndex: 1, paragraphIndex: 2, offset: 3 };

const state = {
  app: stateAfter(
    actions.readingLocationLoaded("b1", location),
    actions.readingLocationLoaded("b2", null),
  ),
};

describe("storedPlacesSelectors", () => {
  it("selectIsReadingLocationLoaded is false until the stored place has been read", () => {
    expect(selectIsReadingLocationLoaded("b3")(state)).toBe(false);
  });

  it("selectIsReadingLocationLoaded is true for a book with no stored place", () => {
    expect(selectIsReadingLocationLoaded("b2")(state)).toBe(true);
  });
});
