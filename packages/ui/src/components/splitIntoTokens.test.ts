import { describe, expect, it } from "vitest";
import { splitIntoTokens } from "./splitIntoTokens.ts";

describe("splitIntoTokens", () => {
  it("keeps punctuation outside the word", () => {
    expect(splitIntoTokens("quiet.")).toEqual([
      { kind: "word", text: "quiet" },
      { kind: "other", text: "." },
    ]);
  });

  it("concatenates back to the original text", () => {
    const text = "“Everything” is quiet — isn’t it?\nYes.";
    expect(
      splitIntoTokens(text)
        .map((token) => token.text)
        .join(""),
    ).toBe(text);
  });

  it("keeps an apostrophe inside a contraction", () => {
    expect(splitIntoTokens("isn’t")).toEqual([{ kind: "word", text: "isn’t" }]);
  });

  it("treats a lone apostrophe as not a word", () => {
    expect(splitIntoTokens("'")).toEqual([{ kind: "other", text: "'" }]);
  });

  it("recognizes words written with marks", () => {
    expect(splitIntoTokens("ねこ 猫")).toEqual([
      { kind: "word", text: "ねこ" },
      { kind: "other", text: " " },
      { kind: "word", text: "猫" },
    ]);
  });
});
