import { describe, expect, it } from "vitest";
import { libraryFailureMessage } from "./libraryFailureMessage.ts";

describe("libraryFailureMessage", () => {
  it("names a published item and tells to unpublish it before changing it", () => {
    expect(
      libraryFailureMessage(
        { status: 409, code: "item_published", message: "" },
        "Failed.",
        "“Im Park”",
      ),
    ).toBe(
      "“Im Park” is published, so its file, subtitles and words can't change while learners use it. Unpublish it, make the change, then publish it again.",
    );
  });

  it("tells to wait while the item is being prepared", () => {
    expect(
      libraryFailureMessage(
        { status: 409, code: "item_processing", message: "" },
        "Failed.",
        "“Im Park”",
      ),
    ).toContain("Wait until its status changes, then try again.");
  });

  it("tells to check the connection when the server can't be reached", () => {
    expect(
      libraryFailureMessage(
        { status: "NETWORK", message: "" },
        "Failed.",
        "“Im Park”",
      ),
    ).toContain("Check your internet connection");
  });

  it("falls back for any other failure", () => {
    expect(
      libraryFailureMessage(
        { status: 500, message: "" },
        "Failed.",
        "“Im Park”",
      ),
    ).toBe("Failed.");
  });

  it("falls back for a code that only matches a property every object has", () => {
    expect(
      libraryFailureMessage(
        { status: 400, code: "toString", message: "" },
        "Failed.",
        "“Im Park”",
      ),
    ).toBe("Failed.");
  });
});
