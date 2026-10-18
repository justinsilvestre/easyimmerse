import { describe, expect, it } from "vitest";
import { roleForNewTrack } from "./roleForNewTrack.ts";

describe("roleForNewTrack", () => {
  it("makes the first track the target-language subtitles", () => {
    expect(
      roleForNewTrack({ target_track_id: null, translation_track_id: null }),
    ).toBe("target");
  });

  it("makes the second track the translation", () => {
    expect(
      roleForNewTrack({ target_track_id: "a", translation_track_id: null }),
    ).toBe("translation");
  });

  it("replaces the target-language track once both are shown", () => {
    expect(
      roleForNewTrack({ target_track_id: "a", translation_track_id: "b" }),
    ).toBe("target");
  });
});
