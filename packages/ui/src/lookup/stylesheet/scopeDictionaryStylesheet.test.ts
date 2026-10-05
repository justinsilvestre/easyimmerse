import { describe, expect, it } from "vitest";
import { resolveFakeMediaUrl } from "../../testSupport/renderDefinition.tsx";
import { scopeDictionaryStylesheet } from "./scopeDictionaryStylesheet.ts";

const scope = '[data-dictionary-scope="d"]';

function scoped(css: string): string {
  return scopeDictionaryStylesheet(css, "d", resolveFakeMediaUrl);
}

describe("scopeDictionaryStylesheet", () => {
  describe("for selectors", () => {
    it("confines a selector to the dictionary's scope", () => {
      expect(scoped("b { font-weight: 900 }")).toBe(
        `${scope} b { font-weight: 900; }`,
      );
    });

    it("confines every selector of a list", () => {
      expect(scoped("b, i { font-weight: 900 }")).toBe(
        `${scope} b, ${scope} i { font-weight: 900; }`,
      );
    });

    it("prefixes class names as rendered markup prefixes them", () => {
      expect(scoped(".pos:not(.hw) { font-weight: 900 }")).toBe(
        `${scope} .dict-pos:not(.dict-hw) { font-weight: 900; }`,
      );
    });

    it("prefixes the class names that a class attribute selector compares with", () => {
      expect(scoped('[class~="pos"] { font-weight: 900 }')).toBe(
        `${scope} [class~="dict-pos"] { font-weight: 900; }`,
      );
    });

    it("keeps the data attributes of structured content", () => {
      expect(scoped('[data-sc-content="glossary"] { margin: 0 }')).toBe(
        `${scope} [data-sc-content="glossary"] { margin: 0; }`,
      );
    });

    it("reads a body selector as the scope root", () => {
      expect(scoped("body { margin: 0 }")).toBe(`${scope} { margin: 0; }`);
    });

    it("reads a :root selector as the scope root", () => {
      expect(scoped(":root { margin: 0 }")).toBe(`${scope} { margin: 0; }`);
    });

    it("drops the ancestors of the document root", () => {
      expect(scoped("html body > .entry { margin: 0 }")).toBe(
        `${scope}>.dict-entry { margin: 0; }`,
      );
    });

    it("keeps the rest of the compound selector that holds the document root", () => {
      expect(scoped("body.dark p { margin: 0 }")).toBe(
        `${scope}.dict-dark p { margin: 0; }`,
      );
    });

    it("drops a selector for the siblings of the document root, which lie outside the scope", () => {
      expect(scoped("body + p { margin: 0 }")).toBe("");
    });

    it("drops a rule nested inside another, since it depends on the rule around it", () => {
      expect(scoped(".a { margin: 0; & .b { margin: 1px } }")).toBe(
        `${scope} .dict-a { margin: 0; }`,
      );
    });

    it("keeps a rule after an unbalanced brace inside the scope", () => {
      const css = scoped(".a { margin: 0 } } .b { margin: 1px }");
      expect(css.split("\n").every((rule) => rule.startsWith(scope))).toBe(
        true,
      );
    });
  });

  describe("for at-rules", () => {
    it("drops @import", () => {
      expect(scoped('@import "https://example.com/a.css";')).toBe("");
    });

    it("keeps a media query with its rules confined", () => {
      expect(scoped("@media (max-width: 30em) { b { margin: 0 } }")).toBe(
        `@media (max-width:30em) {\n${scope} b { margin: 0; }\n}`,
      );
    });

    it("writes the rules of a layer without the layer", () => {
      expect(scoped("@layer base { b { margin: 0 } }")).toBe(
        `${scope} b { margin: 0; }`,
      );
    });

    it("drops @keyframes, whose names are global to the page", () => {
      expect(scoped("@keyframes spin { to { rotate: 1turn } }")).toBe("");
    });

    it("drops @property, which would change the app's own custom properties", () => {
      expect(
        scoped("@property --color-fg { syntax: '*'; inherits: false }"),
      ).toBe("");
    });

    it("gives a font face a family name unique to the dictionary", () => {
      expect(
        scoped(
          '@font-face { font-family: "Phonetic"; src: url(fonts/ph.woff2) }',
        ),
      ).toBe(
        '@font-face { font-family: "d Phonetic"; src: url(media://d/fonts/ph.woff2); }',
      );
    });

    it("uses the unique family name wherever the dictionary uses its font", () => {
      expect(
        scoped(
          "@font-face { font-family: Phonetic; src: url(ph.woff2) } .ipa { font-family: Phonetic, serif }",
        ).split("\n")[1],
      ).toBe(`${scope} .dict-ipa { font-family: "d Phonetic",serif; }`);
    });

    it("leaves a family the dictionary does not declare as it is", () => {
      expect(scoped(".ipa { font: 12px Georgia, serif }")).toBe(
        `${scope} .dict-ipa { font: 12px Georgia,serif; }`,
      );
    });

    it("drops a font face whose source is remote", () => {
      expect(
        scoped(
          '@font-face { font-family: "X"; src: url(https://example.com/x.woff2) }',
        ),
      ).toBe("");
    });
  });

  describe("for declarations", () => {
    it("drops position: fixed", () => {
      expect(scoped("b { position: fixed; margin: 0 }")).toBe(
        `${scope} b { margin: 0; }`,
      );
    });

    it("keeps position: absolute, which the scope's container confines", () => {
      expect(scoped("b { position: absolute }")).toBe(
        `${scope} b { position: absolute; }`,
      );
    });

    it("drops a url() to a remote server", () => {
      expect(
        scoped("b { background-image: url(https://example.com/a.png) }"),
      ).toBe("");
    });

    it("drops a protocol-relative url()", () => {
      expect(scoped("b { background-image: url(//example.com/a.png) }")).toBe(
        "",
      );
    });

    it("resolves a url() to a dictionary file through resolveMediaUrl", () => {
      expect(scoped("b { background-image: url('img/a.png') }")).toBe(
        `${scope} b { background-image: url(media://d/img/a.png); }`,
      );
    });

    it("drops a url() to a dictionary file that is not available", () => {
      expect(
        scopeDictionaryStylesheet(
          "b { background-image: url(a.png) }",
          "d",
          () => null,
        ),
      ).toBe("");
    });

    it("keeps an embedded image", () => {
      expect(
        scoped("b { list-style-image: url(data:image/png;base64,AAAA) }"),
      ).toBe(
        `${scope} b { list-style-image: url(data:image/png;base64,AAAA); }`,
      );
    });

    it("drops a function that loads a resource", () => {
      expect(scoped("b { background-image: image-set('a.png' 1x) }")).toBe("");
    });

    it("drops an expression", () => {
      expect(scoped("b { width: expression(alert(1)) }")).toBe("");
    });

    it("drops a url() spelled with an escape", () => {
      expect(
        scoped("b { background: u\\72l(https://example.com/a.png) }"),
      ).toBe("");
    });

    it("drops a behavior", () => {
      expect(scoped("b { behavior: url(a.htc) }")).toBe("");
    });

    it("drops -moz-binding", () => {
      expect(scoped("b { -moz-binding: url(a.xml#b) }")).toBe("");
    });

    it("drops a property name spelled with an escape", () => {
      expect(scoped("b { posit\\69 on: fixed }")).toBe("");
    });

    it("drops a keyword spelled with an escape", () => {
      expect(scoped("b { position: \\66ixed }")).toBe("");
    });

    it("drops color-scheme, which decides how colors follow the theme", () => {
      expect(scoped("b { color-scheme: dark }")).toBe("");
    });

    it("drops animations, whose keyframe names are global to the page", () => {
      expect(scoped("b { animation: spin 1s }")).toBe("");
    });

    it("prefixes custom properties and their uses", () => {
      expect(scoped("b { --accent: red; margin: var(--gap, 1px) }")).toBe(
        `${scope} b { --dict-accent: red; margin: var(--dict-gap,1px); }`,
      );
    });

    it("keeps !important", () => {
      expect(scoped("b { margin: 0 !important }")).toBe(
        `${scope} b { margin: 0 !important; }`,
      );
    });

    it("follows a text color with one that stays light in a dark color scheme", () => {
      expect(scoped("b { color: #a33 }")).toBe(
        `${scope} b { color: #a33; color: light-dark(#a33, oklch(from #a33 max(l, 0.75) c h)); }`,
      );
    });

    it("follows a background color with one that stays dark in a dark color scheme", () => {
      expect(scoped("b { background: #fee }")).toBe(
        `${scope} b { background: #fee; background: light-dark(#fee, oklch(from #fee min(l, 0.35) c h)); }`,
      );
    });

    it("leaves a color keyword that names no color as it is", () => {
      expect(scoped("b { color: inherit }")).toBe(
        `${scope} b { color: inherit; }`,
      );
    });
  });
});
