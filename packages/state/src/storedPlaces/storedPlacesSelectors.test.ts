import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import { stateAfter } from "../app/stateAfter.ts";
import {
  selectPlaybackPosition,
  selectReadingLocation,
} from "./storedPlacesSelectors.ts";

const location = { chapterIndex: 1, paragraphIndex: 2, offset: 3 };

const state = {
  app: stateAfter(
    actions.readingLocationLoaded("b1", location),
    actions.readingLocationLoaded("b2", null),
    actions.playbackPositionLoaded("m1", 8000),
  ),
};

describe("storedPlacesSelectors", () => {
  it("selectReadingLocation returns the book's last reading location", () => {
    expect(selectReadingLocation("b1")(state)).toEqual(location);
  });

  it("selectReadingLocation returns null for a book with no stored location", () => {
    expect(selectReadingLocation("b2")(state)).toBeNull();
  });

  it("selectReadingLocation returns undefined until the book's location has loaded", () => {
    expect(selectReadingLocation("b3")(state)).toBeUndefined();
  });

  it("selectPlaybackPosition returns where playback last was", () => {
    expect(selectPlaybackPosition("m1")(state)).toBe(8000);
  });
});
