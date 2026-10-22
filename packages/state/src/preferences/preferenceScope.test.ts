import { describe, expect, it } from "vitest";
import { isPersonBoundPreferenceKey } from "./preferenceScope.ts";

/** The same table as `CLASSIFIED_KEYS` in crates/storage/src/preferences.rs, so that both sides classify keys alike. */
const classifiedKeys: readonly (readonly [string, boolean])[] = [
  ["showTranslations", true],
  ["showReviewIntervals", true],
  ["readingLocation:0123abcd", true],
  ["playbackPosition:0123abcd", true],
  ["theme", false],
  ["textScale", false],
  ["readerPreferences", false],
  ["subtitleAppearance", false],
  ["losslessAudio", false],
  ["conversionNoticeDismissed", false],
  ["conversionCacheBudgetBytes", false],
  ["sample_content_seeded", false],
  ["sample_book_seeded:toshishun", false],
  ["placeholder_projects", false],
];

describe("isPersonBoundPreferenceKey", () => {
  it("classifies every known key as the server's table does", () => {
    const misclassified = classifiedKeys
      .filter(
        ([key, isPersonBound]) =>
          isPersonBoundPreferenceKey(key) !== isPersonBound,
      )
      .map(([key]) => key);
    expect(misclassified).toEqual([]);
  });
});
