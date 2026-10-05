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

  it("leaves out the stylesheets and scripts of HTML", () => {
    expect(
      definitionPlainText({
        kind: "html",
        html: "<style>b { color: red }</style><script>run()</script>Hund",
      }),
    ).toBe("Hund");
  });

  it("leaves out the furigana of HTML", () => {
    expect(
      definitionPlainText({
        kind: "html",
        html: "<ruby>食<rp>(</rp><rt>た</rt><rp>)</rp></ruby>べる",
      }),
    ).toBe("食べる");
  });

  it("starts a new line at each line break and block of HTML", () => {
    expect(
      definitionPlainText({
        kind: "html",
        html: "<div>dog</div><ul><li>hound</li></ul>cur<br>mutt",
      }),
    ).toBe("dog\nhound\ncur\nmutt");
  });

  it("starts a new line at each line break of XDXF markup", () => {
    expect(
      definitionPlainText({
        kind: "markup",
        dialect: "xdxf",
        markup: "<k>Hund</k><br/><dtrn>dog</dtrn>",
      }),
    ).toBe("Hund\ndog");
  });

  it("names the base of an inflected form", () => {
    expect(
      definitionPlainText({ kind: "formOf", base: "食べる", inflections: [] }),
    ).toBe("form of 食べる");
  });
});
