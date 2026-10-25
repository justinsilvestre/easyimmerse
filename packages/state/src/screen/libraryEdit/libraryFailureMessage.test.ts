import { describe, expect, it } from "vitest";
import { libraryFailureMessage } from "./libraryFailureMessage.ts";

const didntHappen = "“Im Park” couldn't be saved.";

function messageFor(error: unknown, nextStep?: string) {
  return libraryFailureMessage(error, didntHappen, nextStep);
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

    it("tells that it is already published", () => {
      expect(message).toBe(
        "“Im Park” couldn't be saved. It is already published.",
      );
    });
  });

  it("tells why the kind and translation language of a published item stay", () => {
    expect(
      messageFor({ status: 409, code: "fixed_while_published", message: "" }),
    ).toBe(
      "“Im Park” couldn't be saved. Learners added it to their projects with its kind and translation language, so these can't change while it is published.",
    );
  });

  it("tells to choose a file with sound when the new file has none", () => {
    expect(
      messageFor({ status: 400, code: "no_audio_track", message: "" }),
    ).toBe(
      "“Im Park” couldn't be saved. The new file has no sound, so learners couldn't hear its clips. It keeps its old file. Choose a file with sound.",
    );
  });

  it("tells to check a new file that can't be read", () => {
    expect(
      messageFor({ status: 400, code: "unreadable_file", message: "" }),
    ).toBe(
      "“Im Park” couldn't be saved. The new file couldn't be read as video or audio, so it keeps its old file. Check that the new file plays, then try again.",
    );
  });

  it("tells to wait while the item is being prepared", () => {
    expect(
      messageFor({ status: 409, code: "item_processing", message: "" }),
    ).toBe(
      "“Im Park” couldn't be saved. The server is still preparing it for learners. Wait until its status changes, then try again.",
    );
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
