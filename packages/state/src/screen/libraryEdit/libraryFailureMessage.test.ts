import { describe, expect, it } from "vitest";
import { libraryFailureMessage } from "./libraryFailureMessage.ts";

const didntHappen = "“Im Park” couldn't be saved.";

function messageFor(error: unknown, nextStep?: string) {
  return libraryFailureMessage(error, didntHappen, "“Im Park”", nextStep);
}

describe("libraryFailureMessage", () => {
  describe("for a published item", () => {
    const message = messageFor({
      status: 409,
      code: "item_published",
      message: "",
    });

    it("starts with what didn't happen", () => {
      expect(message.startsWith(`${didntHappen} `)).toBe(true);
    });

    it("tells why and to unpublish it before changing it", () => {
      expect(message).toBe(
        "“Im Park” couldn't be saved. “Im Park” is published, so its file, subtitles and words can't change while learners use it. Unpublish it, make the change, then publish it again.",
      );
    });
  });

  it("tells to wait while the item is being prepared", () => {
    expect(
      messageFor({ status: 409, code: "item_processing", message: "" }),
    ).toContain("Wait until its status changes, then try again.");
  });

  it("tells to check the connection when the server can't be reached", () => {
    expect(messageFor({ status: "NETWORK", message: "" })).toBe(
      "“Im Park” couldn't be saved. easyImmerse couldn't reach the server. Check your internet connection, then try again.",
    );
  });

  it("tells to try again in a moment when the cause is unknown", () => {
    expect(messageFor({ status: 500, message: "" })).toBe(
      "“Im Park” couldn't be saved. Try again in a moment.",
    );
  });

  it("tells the next step given when the cause is unknown", () => {
    expect(
      messageFor({ status: 500, message: "" }, "Open the draft to try again."),
    ).toBe("“Im Park” couldn't be saved. Open the draft to try again.");
  });

  it("treats a code that only matches a property every object has as unknown", () => {
    expect(messageFor({ status: 400, code: "toString", message: "" })).toBe(
      "“Im Park” couldn't be saved. Try again in a moment.",
    );
  });
});
