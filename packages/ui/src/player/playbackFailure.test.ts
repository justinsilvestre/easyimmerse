import { describe, expect, it } from "vitest";
import {
  describeMediaElementError,
  describeUnsupportedReason,
} from "./playbackFailure.ts";

describe("describeUnsupportedReason", () => {
  it("explains a picture that is too tall in the spec's words", () => {
    expect(describeUnsupportedReason("picture_too_tall")).toBe(
      "This video's picture is too tall to convert.",
    );
  });

  it("explains missing conversion", () => {
    expect(describeUnsupportedReason("conversion_unavailable")).toContain(
      "conversion is unavailable",
    );
  });
});

describe("describeMediaElementError", () => {
  it("logs the error's platform name", () => {
    const logged: unknown[][] = [];
    describeMediaElementError({ code: 4 }, (...parts) => logged.push(parts));
    expect(logged[0]).toContain("MEDIA_ERR_SRC_NOT_SUPPORTED");
  });

  it("returns a plain sentence for a network error", () => {
    expect(describeMediaElementError({ code: 2 }, () => undefined)).toBe(
      "The connection to the server was lost.",
    );
  });

  it("returns a plain sentence for a decoding error", () => {
    expect(describeMediaElementError({ code: 3 }, () => undefined)).toBe(
      "The file could not be decoded.",
    );
  });

  it("never puts the code in the sentence", () => {
    expect(describeMediaElementError({ code: 4 }, () => undefined)).not.toMatch(
      /\d/,
    );
  });
});
