import { describe, expect, it } from "vitest";
import { buildDialogFilter } from "./buildDialogFilter.ts";

const subtitles = { kind: "subtitles", role: "target" } as const;

describe("buildDialogFilter", () => {
  it("strips the leading dot from each extension", () => {
    expect(buildDialogFilter(subtitles, [".srt", ".vtt"]).extensions).toEqual([
      "srt",
      "vtt",
    ]);
  });

  it("names the filter after the purpose", () => {
    expect(buildDialogFilter(subtitles, [".srt"]).name).toBe("Subtitles");
  });
});
