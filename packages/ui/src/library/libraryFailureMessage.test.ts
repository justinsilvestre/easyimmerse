import { describe, expect, it } from "vitest";
import { libraryFailureMessage } from "./libraryFailureMessage.ts";

describe("libraryFailureMessage", () => {
  it("tells to unpublish a published item first", () => {
    expect(
      libraryFailureMessage(
        { status: 409, code: "item_published", message: "" },
        "Failed.",
      ),
    ).toBe("Unpublish the item to change its file, subtitles, or words.");
  });

  it("falls back for any other failure", () => {
    expect(libraryFailureMessage({ status: 500, message: "" }, "Failed.")).toBe(
      "Failed.",
    );
  });
});
