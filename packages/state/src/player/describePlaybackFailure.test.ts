import { describe, expect, it } from "vitest";
import { describePlaybackFailure } from "./describePlaybackFailure.ts";

describe("describePlaybackFailure", () => {
  it("names the file, the error code, and the error message", () => {
    expect(describePlaybackFailure("clip.mkv", 3, "Decode failed")).toBe(
      "Could not play clip.mkv. Its format may not be supported here. (MEDIA_ERR_DECODE: Decode failed)",
    );
  });

  it("omits an empty error message", () => {
    expect(describePlaybackFailure("clip.mkv", 4, "")).toBe(
      "Could not play clip.mkv. Its format may not be supported here. (MEDIA_ERR_SRC_NOT_SUPPORTED)",
    );
  });

  it("gives an unknown error code by its number", () => {
    expect(describePlaybackFailure("clip.mkv", 9, "")).toBe(
      "Could not play clip.mkv. Its format may not be supported here. (error code 9)",
    );
  });
});
