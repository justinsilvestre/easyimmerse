import { describe, expect, it } from "vitest";
import { mediaIssueMessage } from "./mediaIssueMessage.ts";

describe("mediaIssueMessage", () => {
  it("tells a browser file is out of this app's reach", () => {
    expect(mediaIssueMessage("browserFileUnreachable", "video")).toBe(
      "This file was added in a web browser, and this app cannot reach it.",
    );
  });

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

  it("tells a file is missing from its path", () => {
    expect(mediaIssueMessage("pathMissing", "audio")).toBe(
      "This file was not found at its path. It may have been moved or deleted.",
    );
  });

  it("tells an audio file cannot play on a server that does not read its disk", () => {
    expect(mediaIssueMessage("pathNotAllowed", "audio")).toBe(
      "This server does not read files on its machine, so this file cannot play here.",
    );
  });

  it("tells an ebook cannot be read on a server that does not read its disk", () => {
    expect(mediaIssueMessage("pathNotAllowed", "ebook")).toBe(
      "This server does not read files on its machine, so this file cannot be read here.",
    );
  });

  it("tells a file could not be read at its path", () => {
    expect(mediaIssueMessage("pathUnreadable", "video")).toBe(
      "This file could not be read at its path.",
    );
  });
});
