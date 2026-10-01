import { describe, expect, it } from "vitest";
import { describeStreamError } from "./describeStreamError.ts";

describe("describeStreamError", () => {
  it("says the server could not provide the stream for a network error", () => {
    expect(describeStreamError("networkError")).toBe(
      "The server could not provide the converted stream.",
    );
  });

  it("says the stream could not be decoded for a media error", () => {
    expect(describeStreamError("mediaError")).toBe(
      "This player could not decode the converted stream.",
    );
  });

  it("says the stream stopped unexpectedly for any other error", () => {
    expect(describeStreamError("muxError")).toBe(
      "The converted stream stopped unexpectedly.",
    );
  });
});
