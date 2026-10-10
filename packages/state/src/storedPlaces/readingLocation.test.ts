import { describe, expect, it } from "vitest";
import {
  isSameParagraph,
  parseReadingLocation,
  readingLocationKey,
} from "./readingLocation.ts";

describe("readingLocationKey", () => {
  it("names the preference after the media file", () => {
    expect(readingLocationKey("m1")).toBe("readingLocation:m1");
  });
});

describe("parseReadingLocation", () => {
  it("reads a stored location", () => {
    const location = { chapterIndex: 2, paragraphIndex: 14, offset: 37 };
    expect(parseReadingLocation(JSON.stringify(location))).toEqual(location);
  });

  it("returns null when nothing is stored", () => {
    expect(parseReadingLocation(null)).toBeNull();
  });

  it("returns null for text that is not JSON", () => {
    expect(parseReadingLocation("chapter 2")).toBeNull();
  });

  it("returns null when a field is missing", () => {
    expect(
      parseReadingLocation('{"chapterIndex":1,"paragraphIndex":0}'),
    ).toBeNull();
  });

  it("returns null when a field is negative", () => {
    expect(
      parseReadingLocation('{"chapterIndex":1,"paragraphIndex":-1,"offset":0}'),
    ).toBeNull();
  });

  it("returns null when a field is not a whole number", () => {
    expect(
      parseReadingLocation(
        '{"chapterIndex":1,"paragraphIndex":0,"offset":0.5}',
      ),
    ).toBeNull();
  });
});

describe("isSameParagraph", () => {
  const location = { chapterIndex: 1, paragraphIndex: 4, offset: 0 };

  it("is true for two offsets in one paragraph", () => {
    expect(isSameParagraph(location, { ...location, offset: 90 })).toBe(true);
  });

  it("is false for the same paragraph number in another chapter", () => {
    expect(isSameParagraph(location, { ...location, chapterIndex: 2 })).toBe(
      false,
    );
  });

  it("is false when there is no earlier location", () => {
    expect(isSameParagraph(location, null)).toBe(false);
  });
});
