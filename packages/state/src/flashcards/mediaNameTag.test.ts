import { describe, expect, it } from "vitest";
import { mediaNameTag } from "./mediaNameTag.ts";

describe("mediaNameTag", () => {
  it("drops the extension and joins words with hyphens", () => {
    expect(mediaNameTag("Dark S01E01 - Geheimnisse.mkv")).toBe(
      "dark-s01e01-geheimnisse",
    );
  });

  it("keeps letters outside the Latin alphabet", () => {
    expect(mediaNameTag("Die Verwandlung (Hörbuch).mp3")).toBe(
      "die-verwandlung-hörbuch",
    );
  });
});
