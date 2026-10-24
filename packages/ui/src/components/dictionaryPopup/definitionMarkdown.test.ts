import type { Definition, StructuredContent } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { definitionMarkdown } from "./definitionMarkdown.ts";

const structured = (content: StructuredContent): Definition => ({
  kind: "structured",
  content,
});

const html = (html: string): Definition => ({ kind: "html", html });

const xdxf = (markup: string): Definition => ({
  kind: "markup",
  dialect: "xdxf",
  markup,
});

const pango = (markup: string): Definition => ({
  kind: "markup",
  dialect: "pango",
  markup,
});

describe("definitionMarkdown", () => {
  describe("with plain text", () => {
    it("keeps the text, trimmed", () => {
      expect(definitionMarkdown({ kind: "text", text: " to eat\n" })).toBe(
        "to eat",
      );
    });
  });

  describe("with an inflected form", () => {
    it("names the base", () => {
      expect(
        definitionMarkdown({ kind: "formOf", base: "食べる", inflections: [] }),
      ).toBe("form of 食べる");
    });
  });

  describe("with structured content", () => {
    it("writes a bullet list", () => {
      expect(
        definitionMarkdown(
          structured({
            tag: "ul",
            content: [
              { tag: "li", content: "to eat" },
              { tag: "li", content: "to devour" },
            ],
          }),
        ),
      ).toBe("- to eat\n- to devour");
    });

    it("writes a numbered list", () => {
      expect(
        definitionMarkdown(
          structured({
            tag: "ol",
            content: [
              { tag: "li", content: "book" },
              { tag: "li", content: "volume" },
            ],
          }),
        ),
      ).toBe("1. book\n2. volume");
    });

    it("indents a nested list under its item by the width of the bullet", () => {
      expect(
        definitionMarkdown(
          structured({
            tag: "ul",
            content: [
              {
                tag: "li",
                content: [
                  "本",
                  {
                    tag: "ul",
                    content: [
                      { tag: "li", content: "book" },
                      { tag: "li", content: "volume" },
                    ],
                  },
                ],
              },
              { tag: "li", content: "origin" },
            ],
          }),
        ),
      ).toBe("- 本\n  - book\n  - volume\n- origin");
    });

    it("indents a nested list under a numbered item by the width of the number", () => {
      expect(
        definitionMarkdown(
          structured({
            tag: "ol",
            content: [
              {
                tag: "li",
                content: [
                  "本",
                  { tag: "ol", content: [{ tag: "li", content: "book" }] },
                ],
              },
            ],
          }),
        ),
      ).toBe("1. 本\n   1. book");
    });

    it("keeps the blocks of an item inside the item", () => {
      expect(
        definitionMarkdown(
          structured({
            tag: "ul",
            content: [
              {
                tag: "li",
                content: [
                  { tag: "div", content: "to eat" },
                  { tag: "div", content: "食べる is a verb." },
                ],
              },
            ],
          }),
        ),
      ).toBe("- to eat\n\n  食べる is a verb.");
    });

    it("leaves out an empty item", () => {
      expect(
        definitionMarkdown(
          structured({
            tag: "ul",
            content: [
              { tag: "li", content: "to eat" },
              { tag: "li", content: " " },
            ],
          }),
        ),
      ).toBe("- to eat");
    });

    it("separates blocks by one blank line", () => {
      expect(
        definitionMarkdown(
          structured([
            { tag: "div", content: "to eat" },
            { tag: "div", content: "to devour" },
          ]),
        ),
      ).toBe("to eat\n\nto devour");
    });

    it("separates a list from the text before it by one blank line", () => {
      expect(
        definitionMarkdown(
          structured([
            "glossary",
            { tag: "ul", content: [{ tag: "li", content: "to eat" }] },
          ]),
        ),
      ).toBe("glossary\n\n- to eat");
    });

    it("breaks the line at a br", () => {
      expect(
        definitionMarkdown(structured(["to eat", { tag: "br" }, "to devour"])),
      ).toBe("to eat\nto devour");
    });

    it("writes a summary as a bold line", () => {
      expect(
        definitionMarkdown(
          structured({
            tag: "details",
            content: [
              { tag: "summary", content: "Examples" },
              { tag: "div", content: "ご飯を食べる" },
            ],
          }),
        ),
      ).toBe("**Examples**\n\nご飯を食べる");
    });

    it("writes nothing for an empty summary", () => {
      expect(
        definitionMarkdown(
          structured({
            tag: "details",
            content: [{ tag: "summary" }, { tag: "div", content: "食べる" }],
          }),
        ),
      ).toBe("食べる");
    });

    it("makes a span with a bold style bold", () => {
      expect(
        definitionMarkdown(
          structured([
            { tag: "span", style: { fontWeight: "bold" }, content: "v1" },
            " to eat",
          ]),
        ),
      ).toBe("**v1** to eat");
    });

    it("makes a span with an italic style italic", () => {
      expect(
        definitionMarkdown(
          structured([
            { tag: "span", style: { fontStyle: "italic" }, content: "rare" },
          ]),
        ),
      ).toBe("*rare*");
    });

    it("puts a space after a span set apart by a right margin", () => {
      expect(
        definitionMarkdown(
          structured([
            {
              tag: "span",
              style: { fontWeight: "bold", marginRight: 0.25 },
              content: "v1",
            },
            "to eat",
          ]),
        ),
      ).toBe("**v1** to eat");
    });

    it("puts a space before a span set apart by a left padding in a shorthand", () => {
      expect(
        definitionMarkdown(
          structured([
            "to eat",
            { tag: "span", style: { padding: "0 0.3em" }, content: "v1" },
          ]),
        ),
      ).toBe("to eat v1");
    });

    it("puts no space beside a span whose margin is zero", () => {
      expect(
        definitionMarkdown(
          structured([
            { tag: "span", style: { marginRight: 0 }, content: "v1" },
            "to eat",
          ]),
        ),
      ).toBe("v1to eat");
    });

    it("keeps the base text of ruby only", () => {
      expect(
        definitionMarkdown(
          structured({
            tag: "ruby",
            content: [
              "食",
              { tag: "rp", content: "(" },
              { tag: "rt", content: "た" },
            ],
          }),
        ),
      ).toBe("食");
    });

    it("keeps only the text of a lookup link", () => {
      expect(
        definitionMarkdown(
          structured({ tag: "a", href: "?query=書籍", content: "書籍" }),
        ),
      ).toBe("書籍");
    });

    it("writes an external link as a Markdown link", () => {
      expect(
        definitionMarkdown(
          structured({
            tag: "a",
            href: "https://example.com/本",
            content: "source",
          }),
        ),
      ).toBe("[source](https://example.com/%E6%9C%AC)");
    });

    it("leaves out images", () => {
      expect(
        definitionMarkdown(
          structured([
            "to eat ",
            { tag: "img", path: "glyph.svg", title: "Glyph" },
          ]),
        ),
      ).toBe("to eat");
    });

    it("writes a table with a header row", () => {
      expect(
        definitionMarkdown(
          structured({
            tag: "table",
            content: [
              {
                tag: "thead",
                content: [
                  {
                    tag: "tr",
                    content: [
                      { tag: "th", content: "Form" },
                      { tag: "th", content: "Reading" },
                    ],
                  },
                ],
              },
              {
                tag: "tbody",
                content: [
                  {
                    tag: "tr",
                    content: [
                      { tag: "td", content: "食べる" },
                      { tag: "td", content: "たべる" },
                    ],
                  },
                ],
              },
            ],
          }),
        ),
      ).toBe("| Form | Reading |\n| --- | --- |\n| 食べる | たべる |");
    });

    it("writes a table without a header row under a blank header", () => {
      expect(
        definitionMarkdown(
          structured({
            tag: "table",
            content: [
              {
                tag: "tr",
                content: [
                  { tag: "td", content: "食べる" },
                  { tag: "td", content: "たべる" },
                ],
              },
            ],
          }),
        ),
      ).toBe("|  |  |\n| --- | --- |\n| 食べる | たべる |");
    });

    it("writes the rows of an uneven table one per line", () => {
      expect(
        definitionMarkdown(
          structured({
            tag: "table",
            content: [
              {
                tag: "tr",
                content: [
                  { tag: "td", content: "食べる" },
                  { tag: "td", content: "たべる" },
                ],
              },
              { tag: "tr", content: [{ tag: "td", content: "to eat" }] },
            ],
          }),
        ),
      ).toBe("食べる | たべる\nto eat");
    });

    it("escapes a pipe inside a table cell", () => {
      expect(
        definitionMarkdown(
          structured({
            tag: "table",
            content: [
              { tag: "tr", content: [{ tag: "td", content: "a | b" }] },
            ],
          }),
        ),
      ).toBe("|  |\n| --- |\n| a \\| b |");
    });

    it("collapses runs of whitespace in text", () => {
      expect(definitionMarkdown(structured("to  eat\n\n  food"))).toBe(
        "to eat food",
      );
    });

    it("never writes two blank lines in a row", () => {
      expect(
        definitionMarkdown(
          structured([
            { tag: "div", content: "to eat" },
            { tag: "div", content: " " },
            { tag: "div", content: "to devour" },
          ]),
        ),
      ).toBe("to eat\n\nto devour");
    });

    it("writes nothing for empty content", () => {
      expect(definitionMarkdown(structured([]))).toBe("");
    });
  });

  describe("with HTML", () => {
    it("makes bold text bold", () => {
      expect(definitionMarkdown(html("<b>Hund</b> <strong>m</strong>"))).toBe(
        "**Hund** **m**",
      );
    });

    it("makes italic text italic", () => {
      expect(definitionMarkdown(html("<i>Hund</i> <em>m</em>"))).toBe(
        "*Hund* *m*",
      );
    });

    it("keeps the spaces around emphasized text outside the markers", () => {
      expect(definitionMarkdown(html("<b> Hund </b>m"))).toBe("**Hund** m");
    });

    it("writes code in backticks", () => {
      expect(definitionMarkdown(html("<code>ls</code>"))).toBe("`ls`");
    });

    it("writes a heading with number signs", () => {
      expect(definitionMarkdown(html("<h2>Noun</h2><p>dog</p>"))).toBe(
        "## Noun\n\ndog",
      );
    });

    it("prefixes a quotation's lines", () => {
      expect(
        definitionMarkdown(html("<blockquote>Der Hund<br>bellt.</blockquote>")),
      ).toBe("> Der Hund\n> bellt.");
    });

    it("breaks the line at a br", () => {
      expect(definitionMarkdown(html("cur<br>mutt"))).toBe("cur\nmutt");
    });

    it("writes a list", () => {
      expect(
        definitionMarkdown(html("<div>dog</div><ul><li>hound</li></ul>cur")),
      ).toBe("dog\n\n- hound\n\ncur");
    });

    it("numbers the items of a list written on separate lines in sequence", () => {
      expect(
        definitionMarkdown(
          html("<ol>\n  <li>hound</li>\n  <li>cur</li>\n</ol>"),
        ),
      ).toBe("1. hound\n2. cur");
    });

    it("puts a space before an element set apart by a left padding", () => {
      expect(
        definitionMarkdown(
          html('Hund<span style="padding-left: 4px">m</span>'),
        ),
      ).toBe("Hund m");
    });

    it("leaves out stylesheets and scripts", () => {
      expect(
        definitionMarkdown(
          html("<style>b { color: red }</style><script>run()</script>Hund"),
        ),
      ).toBe("Hund");
    });

    it("leaves out furigana", () => {
      expect(
        definitionMarkdown(
          html("<ruby>食<rp>(</rp><rt>た</rt><rp>)</rp></ruby>べる"),
        ),
      ).toBe("食べる");
    });

    it("leaves out images", () => {
      expect(definitionMarkdown(html('Hund <img src="dog.png">'))).toBe("Hund");
    });

    it("keeps only the text of a link to another entry", () => {
      expect(definitionMarkdown(html('<a href="bword://Hund">Hund</a>'))).toBe(
        "Hund",
      );
    });

    it("keeps only the text of a link to a fragment", () => {
      expect(definitionMarkdown(html('<a href="#sense-2">2</a>'))).toBe("2");
    });

    it("writes an external link as a Markdown link", () => {
      expect(
        definitionMarkdown(html('<a href="https://example.com/">source</a>')),
      ).toBe("[source](https://example.com/)");
    });

    it("writes an element of another kind as its text", () => {
      expect(definitionMarkdown(html("<u>Hund</u> <sup>1</sup>"))).toBe(
        "Hund 1",
      );
    });

    it("writes the text of unknown elements", () => {
      expect(definitionMarkdown(html("<gloss>dog</gloss>"))).toBe("dog");
    });

    it("collapses runs of whitespace", () => {
      expect(definitionMarkdown(html("<p>\n  Hund\n  m\n</p>"))).toBe("Hund m");
    });

    it("writes a table with a header row", () => {
      expect(
        definitionMarkdown(
          html(
            "<table><tr><th>Case</th><th>Form</th></tr><tr><td>Nom.</td><td>Hund</td></tr></table>",
          ),
        ),
      ).toBe("| Case | Form |\n| --- | --- |\n| Nom. | Hund |");
    });

    it("writes a table with a styled bold cell", () => {
      expect(
        definitionMarkdown(
          html(
            '<table><tr><td style="font-weight: bold">Hund</td></tr></table>',
          ),
        ),
      ).toBe("|  |\n| --- |\n| **Hund** |");
    });

    it("ends without trailing whitespace", () => {
      expect(definitionMarkdown(html("<p>Hund</p>\n\n"))).toBe("Hund");
    });
  });

  describe("with XDXF markup", () => {
    it("leaves out the headword", () => {
      expect(definitionMarkdown(xdxf("<k>Hund</k><dtrn>dog</dtrn>"))).toBe(
        "dog",
      );
    });

    it("breaks the line at a line break in the text", () => {
      expect(
        definitionMarkdown(xdxf("<dtrn>dog</dtrn>\n<ex>Der Hund</ex>")),
      ).toBe("dog\nDer Hund");
    });

    it("breaks the line at a br", () => {
      expect(definitionMarkdown(xdxf("<dtrn>dog</dtrn><br/>cur"))).toBe(
        "dog\ncur",
      );
    });

    it("keeps only the text of a cross reference", () => {
      expect(definitionMarkdown(xdxf('<kref k="Hündin">Hündin</kref>'))).toBe(
        "Hündin",
      );
    });

    it("writes a transcription as its text", () => {
      expect(definitionMarkdown(xdxf("<tr>hʊnt</tr> dog"))).toBe("hʊnt dog");
    });
  });

  describe("with Pango markup", () => {
    it("makes a bold span bold", () => {
      expect(
        definitionMarkdown(pango('<span weight="bold">Hund</span> dog')),
      ).toBe("**Hund** dog");
    });

    it("makes an italic span italic", () => {
      expect(
        definitionMarkdown(pango('<span style="italic">Hund</span> dog')),
      ).toBe("*Hund* dog");
    });

    it("breaks the line at a line break in the text", () => {
      expect(definitionMarkdown(pango("<b>Hund</b>\ndog"))).toBe(
        "**Hund**\ndog",
      );
    });
  });
});
