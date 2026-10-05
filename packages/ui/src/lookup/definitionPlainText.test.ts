import { describe, expect, it } from "vitest";
import { definitionPlainText } from "./definitionPlainText.ts";

describe("definitionPlainText", () => {
  it("keeps plain text as it is", () => {
    expect(definitionPlainText({ kind: "text", text: "to eat" })).toBe(
      "to eat",
    );
  });

  it("puts each item of structured content on its own line", () => {
    expect(
      definitionPlainText({
        kind: "structured",
        content: {
          tag: "ul",
          content: [
            { tag: "li", content: "to eat" },
            { tag: "li", content: "to devour" },
          ],
        },
      }),
    ).toBe("to eat\nto devour");
  });

  it("leaves out the furigana of structured content", () => {
    expect(
      definitionPlainText({
        kind: "structured",
        content: { tag: "ruby", content: ["食", { tag: "rt", content: "た" }] },
      }),
    ).toBe("食");
  });

  it("reads the text of HTML", () => {
    expect(
      definitionPlainText({ kind: "html", html: "<b>Hund</b> <i>m</i>" }),
    ).toBe("Hund m");
  });

  it("names the base of an inflected form", () => {
    expect(
      definitionPlainText({ kind: "formOf", base: "食べる", inflections: [] }),
    ).toBe("form of 食べる");
  });
});
