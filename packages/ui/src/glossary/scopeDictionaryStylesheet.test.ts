import { describe, expect, it } from "vitest";
import { scopeDictionaryStylesheet } from "./scopeDictionaryStylesheet.ts";

const unwrap = (scoped: string) =>
  scoped.replace(/^@scope \{\n/, "").replace(/\n\}$/, "");

const sanitize = (css: string) => unwrap(scopeDictionaryStylesheet(css));

describe("scopeDictionaryStylesheet", () => {
  it("wraps the rules in a scope rooted at the style element's parent", () => {
    expect(scopeDictionaryStylesheet("b { color: red; }")).toBe(
      "@scope {\nb { color: red; }\n}",
    );
  });

  it("keeps nested rules", () => {
    const css = "li { & ul { list-style-type: none; } }";
    expect(sanitize(css)).toBe(css);
  });

  it("keeps strings that hold braces", () => {
    const css = 'ul { list-style-type: "}"; }';
    expect(sanitize(css)).toBe(css);
  });

  it("drops comments", () => {
    expect(sanitize("/* } */b { color: red; }")).toBe("b { color: red; }");
  });

  describe("when the stylesheet tries to leave the scope", () => {
    it("drops a closing brace that has no opening brace", () => {
      expect(sanitize("} body { color: red; }")).toBe(" body { color: red; }");
    });

    it("closes the blocks left open", () => {
      expect(sanitize("b { color: red;")).toBe("b { color: red;}");
    });

    it("ends a string at a line break, as browsers do", () => {
      expect(sanitize('b { content: "a\n} c { color: red; }')).toBe(
        'b { content: "a\n} c { color: red; }',
      );
    });

    it("closes a string left open at the end", () => {
      expect(sanitize('b { content: "a')).toBe('b { content: "a"}');
    });
  });

  describe("when the stylesheet refers to other resources", () => {
    it("drops @import rules", () => {
      expect(sanitize('@import "https://example.com/a.css";b{}')).toBe("b{}");
    });

    it("drops @import rules written with escapes", () => {
      expect(sanitize("@\\69mport url(a.css);b{}")).toBe("b{}");
    });

    it("drops @font-face rules", () => {
      expect(
        sanitize("@font-face { font-family: x; src: url(x.woff); }b{}"),
      ).toBe("b{}");
    });

    it("replaces an unquoted remote url with none", () => {
      expect(
        sanitize("b { background: url(https://example.com/a.png); }"),
      ).toBe("b { background: none; }");
    });

    it("replaces a quoted remote url with none", () => {
      expect(sanitize('b { background: url("a.png"); }')).toBe(
        "b { background: none; }",
      );
    });

    it("replaces a url function written with escapes", () => {
      expect(sanitize("b { background: u\\72l(a.png); }")).toBe(
        "b { background: none; }",
      );
    });

    it("replaces an image-set, whose strings are urls", () => {
      expect(sanitize('b { background: image-set("a.png" 1x); }')).toBe(
        "b { background: none; }",
      );
    });

    it("keeps a data url for an image", () => {
      const css = "b { background: url(data:image/png;base64,iVBORw0=); }";
      expect(sanitize(css)).toBe(css);
    });

    it("replaces a data url that holds characters outside a plain encoding", () => {
      expect(
        sanitize('b { background: url("data:image/svg+xml,<svg>}"); }'),
      ).toBe("b { background: none; }");
    });
  });
});
