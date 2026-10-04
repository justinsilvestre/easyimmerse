import { describe, expect, it } from "vitest";
import { distributeFurigana } from "./distributeFurigana.ts";

describe("distributeFurigana", () => {
  it("puts the reading over the kanji and leaves the kana trailing them bare", () => {
    expect(distributeFurigana("食べる", "たべる")).toEqual([
      { text: "食", ruby: "た" },
      { text: "べる", ruby: null },
    ]);
  });

  it("splits the reading between kanji runs separated by kana", () => {
    expect(distributeFurigana("取り扱い", "とりあつかい")).toEqual([
      { text: "取", ruby: "と" },
      { text: "り", ruby: null },
      { text: "扱", ruby: "あつか" },
      { text: "い", ruby: null },
    ]);
  });

  it("matches katakana in the term against a hiragana reading", () => {
    expect(distributeFurigana("お茶", "おちゃ")).toEqual([
      { text: "お", ruby: null },
      { text: "茶", ruby: "ちゃ" },
    ]);
  });

  it("puts the whole reading over the whole term when the kana do not line up", () => {
    expect(distributeFurigana("Ｎ響", "エヌきょう")).toEqual([
      { text: "Ｎ響", ruby: "エヌきょう" },
    ]);
  });

  it("adds no reading to a term without kanji", () => {
    expect(distributeFurigana("たべる", "タベル")).toEqual([
      { text: "たべる", ruby: null },
    ]);
  });

  it("adds no reading when there is none", () => {
    expect(distributeFurigana("食", null)).toEqual([
      { text: "食", ruby: null },
    ]);
  });
});
