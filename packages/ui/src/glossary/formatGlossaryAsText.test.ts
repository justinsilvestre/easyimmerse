import type { Glossary, StructuredContent } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { findStructuredEntry } from "../testSupport/fixtureStructuredLookup.ts";
import { formatGlossaryAsText } from "./formatGlossaryAsText.ts";

const formatContent = (content: StructuredContent) =>
  formatGlossaryAsText({ type: "structured-content", content });

describe("formatGlossaryAsText", () => {
  it("returns a plain string as it is", () => {
    expect(formatGlossaryAsText("hound")).toBe("hound");
  });

  it("returns the text of a text item", () => {
    expect(formatGlossaryAsText({ type: "text", text: "dog" })).toBe("dog");
  });

  it("returns the description of an image item", () => {
    expect(
      formatGlossaryAsText({
        type: "image",
        path: "a.png",
        description: "A dog.",
      }),
    ).toBe("A dog.");
  });

  it("returns nothing for an image item without a description", () => {
    expect(formatGlossaryAsText({ type: "image", path: "a.png" })).toBe("");
  });

  it("describes an inflected form", () => {
    expect(formatGlossaryAsText(["食べる", ["past"]])).toBe(
      "Inflected form of 食べる (past)",
    );
  });

  describe("for structured content", () => {
    it("puts each block element on its own line", () => {
      expect(
        formatContent([
          { tag: "span", content: "n" },
          { tag: "ul", content: { tag: "li", content: "cat" } },
        ]),
      ).toBe("n\ncat");
    });

    it("puts each list item on its own line", () => {
      expect(
        formatContent({
          tag: "ol",
          content: [
            { tag: "li", content: "one" },
            { tag: "li", content: "two" },
          ],
        }),
      ).toBe("one\ntwo");
    });

    it("breaks the line at a line break", () => {
      expect(formatContent(["a", { tag: "br" }, "b"])).toBe("a\nb");
    });

    it("keeps inline elements on one line", () => {
      expect(formatContent(["black ", { tag: "span", content: "cat" }])).toBe(
        "black cat",
      );
    });

    it("leaves out ruby readings", () => {
      expect(
        formatContent([
          { tag: "ruby", content: ["一", { tag: "rt", content: "いち" }] },
          "の字点",
        ]),
      ).toBe("一の字点");
    });

    it("puts each table row on its own line, with its cells apart", () => {
      expect(
        formatContent({
          tag: "table",
          content: {
            tag: "tr",
            content: [
              { tag: "th", content: "a" },
              { tag: "td", content: "b" },
            ],
          },
        }),
      ).toBe("a b");
    });

    it("leaves out images", () => {
      const [catItem] = findStructuredEntry("猫").definitions;
      expect(formatGlossaryAsText(catItem as Glossary)).toBe("n\ncat");
    });
  });
});
