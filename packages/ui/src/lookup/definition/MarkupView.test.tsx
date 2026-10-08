import type { Definition } from "@easyimmerse/types";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { doubleClick } from "../../testSupport/doubleClick.ts";
import {
  renderDefinition,
  resolveFakeMediaUrl,
} from "../../testSupport/renderDefinition.tsx";

afterEach(cleanup);

function html(markup: string): Definition {
  return { kind: "html", html: markup };
}

function pango(markup: string): Definition {
  return { kind: "markup", dialect: "pango", markup };
}

function xdxf(markup: string): Definition {
  return { kind: "markup", dialect: "xdxf", markup };
}

describe("MarkupView", () => {
  describe("for HTML", () => {
    it("drops a script with its content", () => {
      const { container } = renderDefinition(
        html("a<script>alert(1)</script>b"),
      );
      expect(container.textContent).toBe("ab");
    });

    it("drops a style element with its content", () => {
      const { container } = renderDefinition(html("<style>p{}</style>text"));
      expect(container.textContent).toBe("text");
    });

    it("drops an iframe", () => {
      const { container } = renderDefinition(html("<iframe></iframe>"));
      expect(container.querySelector("iframe")).toBeNull();
    });

    it("drops event handler attributes", () => {
      const { container } = renderDefinition(
        html('<b onclick="alert(1)">bold</b>'),
      );
      expect(container.querySelector("[onclick]")).toBeNull();
    });

    it("keeps the text of an unknown element", () => {
      const { container } = renderDefinition(html("<blink>hello</blink>"));
      expect(container.textContent).toBe("hello");
    });

    it("keeps an allowlisted element", () => {
      const { container } = renderDefinition(html("<i>italic</i>"));
      expect(container.querySelector("i")?.textContent).toBe("italic");
    });

    it("renders a javascript link as plain content", () => {
      const { container } = renderDefinition(
        html('<a href="javascript:alert(1)">click</a>'),
      );
      expect(container.querySelector("a, [href]")).toBeNull();
    });

    it("drops a style value that loads a resource", () => {
      const { container } = renderDefinition(
        html(
          '<span style="background-color: url(https://example.com/x.png)">x</span>',
        ),
      );
      expect(container.querySelector("[style]")).toBeNull();
    });

    it("keeps a safe style value", () => {
      const { container } = renderDefinition(
        html('<span style="color: red">x</span>'),
      );
      expect(
        container.querySelector("span[style]")?.getAttribute("style"),
      ).toBe("color: red;");
    });

    it("keeps the dictionary's class names with a prefix", () => {
      const { container } = renderDefinition(
        html('<span class="pos noun">noun</span>'),
      );
      expect(
        container.querySelector("span.dict-pos.dict-noun")?.textContent,
      ).toBe("noun");
    });

    it("keeps the app's own classes beside the dictionary's", () => {
      const { container } = renderDefinition(html('<i class="pos">noun</i>'));
      expect(container.querySelector("i")?.className).toBe("italic dict-pos");
    });

    it("does not let a dictionary class name match an app class", () => {
      const { container } = renderDefinition(html('<b class="fixed">x</b>'));
      expect(container.querySelector(".fixed")).toBeNull();
    });

    it.each([
      ...["strong", "em", "h1", "h2", "h3", "h4", "h5", "h6", "section"],
      ...["article", "header", "footer", "figure", "figcaption", "small"],
      ...["mark", "abbr", "cite", "q", "blockquote", "dl", "dt", "dd"],
    ])(
      "keeps a %s element as itself, so that stylesheets can select it",
      (tag) => {
        const { container } = renderDefinition(html(`<${tag}>x</${tag}>`));
        expect(container.querySelector(tag)?.textContent).toBe("x");
      },
    );

    it("keeps an id with a prefix that names the dictionary", () => {
      const { container } = renderDefinition(html('<p id="top">x</p>'));
      expect(container.querySelector("#dict-dict-top")?.textContent).toBe("x");
    });

    it("drops an id that holds whitespace", () => {
      const { container } = renderDefinition(html('<p id="a b">x</p>'));
      expect(container.querySelector("[id]")).toBeNull();
    });

    it("links a same-document link to the prefixed id", () => {
      renderDefinition(html('<p id="top">x</p><a href="#top">up</a>'));
      expect(
        screen.getByRole("link", { name: "up" }).getAttribute("href"),
      ).toBe("#dict-dict-top");
    });

    it("scrolls to the element that a same-document link names", () => {
      const { container } = renderDefinition(
        html('<p id="top">x</p><a href="#top">up</a>'),
      );
      const target = container.querySelector("#dict-dict-top") as HTMLElement;
      target.scrollIntoView = vi.fn();
      fireEvent.click(screen.getByRole("link", { name: "up" }));
      expect(target.scrollIntoView).toHaveBeenCalled();
    });

    it("follows a same-document link without changing the page's address", () => {
      renderDefinition(html('<a href="#missing">up</a>'));
      expect(fireEvent.click(screen.getByRole("link", { name: "up" }))).toBe(
        false,
      );
    });

    it("looks up the target of a bword link", () => {
      const clicked: string[] = [];
      renderDefinition(html('<a href="bword://bloom">bloom</a>'), {
        onLookup: (term) => clicked.push(term),
      });
      fireEvent.click(screen.getByRole("button", { name: "bloom" }));
      expect(clicked).toEqual(["bloom"]);
    });

    it("does not treat the text of a lookup link as words of its own", () => {
      const looked: string[] = [];
      renderDefinition(html('<a href="bword://bloom">bloom</a>'), {
        onWordLookup: (word) => looked.push(word),
      });
      doubleClick(screen.getByRole("button", { name: "bloom" }));
      expect(looked).toEqual([]);
    });

    it("keeps text written with escaped angle brackets", () => {
      const { container } = renderDefinition(html("&lt;colloq.&gt; mate"));
      expect(container.textContent).toBe("<colloq.> mate");
    });

    it("looks up the target of an entry link", () => {
      const clicked: string[] = [];
      renderDefinition(html('<a href="entry://fruit">see</a>'), {
        onLookup: (term) => clicked.push(term),
      });
      fireEvent.click(screen.getByRole("button", { name: "see" }));
      expect(clicked).toEqual(["fruit"]);
    });

    it("opens an https link in a new window without access to the app", () => {
      renderDefinition(html('<a href="https://example.com/">site</a>'));
      expect(
        screen.getByRole("link", { name: "site" }).getAttribute("rel"),
      ).toBe("noopener noreferrer");
    });

    it("renders a sound link as a disabled play control", () => {
      renderDefinition(html('<a href="sound://a.mp3">play</a>'));
      expect(
        (
          screen.getByRole("button", {
            name: "Play sound",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(true);
    });

    it("resolves a relative image through resolveMediaUrl", () => {
      renderDefinition(html('<img src="res/flower.png" alt="flower">'), {
        resolveMediaUrl: resolveFakeMediaUrl,
      });
      expect(
        screen.getByRole("img", { name: "flower" }).getAttribute("src"),
      ).toBe("media://dict/res/flower.png");
    });

    it("does not load a remote image", () => {
      const { container } = renderDefinition(
        html('<img src="https://example.com/a.gif">'),
        {
          resolveMediaUrl: resolveFakeMediaUrl,
        },
      );
      expect(container.querySelector("img")).toBeNull();
    });

    it("collapses whitespace in text", () => {
      const { container } = renderDefinition(html("a\n   b"));
      expect(container.textContent).toBe("a b");
    });
  });

  describe("for Pango", () => {
    it("turns span attributes into a safe style", () => {
      const { container } = renderDefinition(
        pango('<span foreground="blue" weight="bold">x</span>'),
      );
      expect(
        container.querySelector("span[style]")?.getAttribute("style"),
      ).toBe("color: blue; font-weight: 700;");
    });

    it("keeps line breaks in the text", () => {
      const { container } = renderDefinition(pango("one\ntwo"));
      expect(container.textContent).toBe("one\ntwo");
    });

    it("drops a script even when the markup is not well-formed", () => {
      const { container } = renderDefinition(
        pango("&nbsp;<script>alert(1)</script>ok"),
      );
      expect(container.textContent?.trim()).toBe("ok");
    });
  });

  describe("for XDXF", () => {
    it("looks up the target of a kref", () => {
      const clicked: string[] = [];
      renderDefinition(xdxf("see <kref>home</kref>"), {
        onLookup: (term) => clicked.push(term),
      });
      fireEvent.click(screen.getByRole("button", { name: "home" }));
      expect(clicked).toEqual(["home"]);
    });

    it("hides the headword, which the card already shows", () => {
      const { container } = renderDefinition(xdxf("<k>house</k>дом"));
      expect(container.textContent).toBe("дом");
    });

    it("drops the line break left by the hidden headword", () => {
      const { container } = renderDefinition(
        xdxf("<k>house</k>\n<tr>haʊs</tr>"),
      );
      expect(container.textContent).toBe("haʊs");
    });

    it("drops a line break between senses, which start their own lines", () => {
      const { container } = renderDefinition(
        xdxf("<def>a</def>\n<def>b</def>"),
      );
      expect(container.textContent).toBe("ab");
    });

    it("keeps a transcription, which an HTML parser would drop outside a table", () => {
      const { container } = renderDefinition(xdxf("<tr>haʊs</tr>"));
      expect(container.textContent).toBe("haʊs");
    });

    it("keeps the text of a grammatical label", () => {
      const { container } = renderDefinition(xdxf("<abr>n</abr>"));
      expect(container.textContent).toBe("n");
    });

    it("resolves an image resource through resolveMediaUrl", () => {
      const { container } = renderDefinition(
        xdxf('<rref type="image">pic.png</rref>'),
        {
          resolveMediaUrl: resolveFakeMediaUrl,
        },
      );
      expect(container.querySelector("img")?.getAttribute("src")).toBe(
        "media://dict/pic.png",
      );
    });
  });
});
