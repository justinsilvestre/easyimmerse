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

  it("tells to wait while the item is being prepared", () => {
    expect(
      libraryFailureMessage(
        { status: 409, code: "item_processing", message: "" },
        "Failed.",
      ),
    ).toBe("Wait until the item is prepared, then try again.");
  });

  it("falls back for any other failure", () => {
    expect(libraryFailureMessage({ status: 500, message: "" }, "Failed.")).toBe(
      "Failed.",
    );
  });
});
