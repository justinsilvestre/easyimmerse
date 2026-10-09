import { describe, expect, it } from "vitest";
import { mediaIssueMessage } from "./mediaIssueMessage.ts";

describe("mediaIssueMessage", () => {
  it("asks to add a video again to play it", () => {
    expect(mediaIssueMessage("browserFileNotOpen", "video")).toBe(
      "This file is no longer open in the browser. Add it again to play it.",
    );
  });

  it("asks to add an ebook again to read it", () => {
    expect(mediaIssueMessage("browserFileNotOpen", "ebook")).toBe(
      "This file is no longer open in the browser. Add it again to read it.",
    );
  });
});
