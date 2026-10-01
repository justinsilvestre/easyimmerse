import { describe, expect, it } from "vitest";
import { buildDialogFilter } from "./buildDialogFilter.ts";

describe("buildDialogFilter", () => {
  it("strips the leading dot from each extension", () => {
    expect(buildDialogFilter([".srt", ".vtt"]).extensions).toEqual([
      "srt",
      "vtt",
    ]);
  });

  it("names the filter for the dialog", () => {
    expect(buildDialogFilter([".srt"]).name).toBe("Subtitles");
  });
});
