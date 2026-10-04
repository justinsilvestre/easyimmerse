import { describe, expect, it } from "vitest";
import type { EditorState } from "./editFlashcard.ts";
import { reduceEditor } from "./editFlashcard.ts";
import { exampleFlashcard } from "./exampleFlashcard.ts";

const state: EditorState = {
  content: {
    ...exampleFlashcard,
    screenshot: { url: "data:old", at_ms: 6800 },
  },
  includedFields: ["word", "screenshot"],
};

describe("reduceEditor", () => {
  it("moves the screenshot time for screenshotMsChanged", () => {
    expect(
      reduceEditor(state, { type: "screenshotMsChanged", ms: 7000 }).content
        .screenshot?.at_ms,
    ).toBe(7000);
  });

  it("takes a captured screenshot taken at the current screenshot time", () => {
    const moved = reduceEditor(state, {
      type: "screenshotMsChanged",
      ms: 7000,
    });
    expect(
      reduceEditor(moved, {
        type: "screenshotCaptured",
        screenshot: { url: "data:new", at_ms: 7000 },
      }).content.screenshot?.url,
    ).toBe("data:new");
  });

  it("ignores a captured screenshot from a time since left", () => {
    expect(
      reduceEditor(state, {
        type: "screenshotCaptured",
        screenshot: { url: "data:new", at_ms: 7000 },
      }).content.screenshot?.url,
    ).toBe("data:old");
  });
});
