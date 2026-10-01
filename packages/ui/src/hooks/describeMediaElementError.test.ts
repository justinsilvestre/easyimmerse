import { describe, expect, it } from "vitest";
import { describeMediaElementError } from "./describeMediaElementError.ts";

/** The codes of the browser's MediaError, which the test environment does not define. */
const codes = { aborted: 1, network: 2, decode: 3, sourceNotSupported: 4 };

describe("describeMediaElementError", () => {
  it("says the file could not be read for a network error", () => {
    expect(describeMediaElementError(codes.network)).toBe(
      "The media file could not be read.",
    );
  });

  it("says the file could not be decoded for a decoding error", () => {
    expect(describeMediaElementError(codes.decode)).toBe(
      "This player could not decode the media file.",
    );
  });

  it("says the format is unsupported for an unsupported source", () => {
    expect(describeMediaElementError(codes.sourceNotSupported)).toBe(
      "This player does not support the file's format.",
    );
  });

  it("says playback stopped unexpectedly for any other error", () => {
    expect(describeMediaElementError(codes.aborted)).toBe(
      "Playback stopped unexpectedly.",
    );
  });

  it("says playback stopped unexpectedly when the error is unknown", () => {
    expect(describeMediaElementError(undefined)).toBe(
      "Playback stopped unexpectedly.",
    );
  });
});
