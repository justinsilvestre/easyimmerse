import type { ImageElement, StructuredContent } from "@easyimmerse/types";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { doubleClick } from "../../testSupport/doubleClick.ts";
import {
  renderDefinition,
  resolveFakeMediaUrl,
} from "../../testSupport/renderDefinition.tsx";

afterEach(cleanup);

function renderContent(
  content: StructuredContent,
  options?: Parameters<typeof renderDefinition>[1],
) {
  return renderDefinition({ kind: "structured", content }, options);
}

describe("StructuredContentView", () => {
  it("renders an element for each known tag", () => {
    const { container } = renderContent({
      tag: "ul",
      content: [{ tag: "li", content: "one" }],
    });
    expect(container.querySelector("ul > li")?.textContent).toBe("one");
  });

  it("gives an element Yomitan's class for its tag, prefixed like the dictionary's classes", () => {
    const { container } = renderContent({ tag: "span", content: "x" });
    expect(container.querySelector(".dict-gloss-sc-span")?.textContent).toBe(
      "x",
    );
  });

  it("gives a table cell Yomitan's class for its tag", () => {
    const { container } = renderContent({
      tag: "table",
      content: { tag: "tr", content: { tag: "td", content: "x" } },
    });
    expect(container.querySelector("td")?.className).toContain(
      "dict-gloss-sc-td",
    );
  });

  it("gives a link Yomitan's link class", () => {
    renderContent({ tag: "a", href: "?query=x", content: "x" });
    expect(screen.getByRole("button", { name: "x" }).className).toContain(
      "dict-gloss-link",
    );
  });

  it("wraps a link's text in Yomitan's link text element", () => {
    const { container } = renderContent({
      tag: "a",
      href: "?query=x",
      content: "x",
    });
    expect(
      container.querySelector(".dict-gloss-link > .dict-gloss-link-text")
        ?.textContent,
    ).toBe("x");
  });

  it("puts a table in Yomitan's table container", () => {
    const { container } = renderContent({
      tag: "table",
      content: { tag: "tr", content: { tag: "td", content: "x" } },
    });
    expect(
      container.querySelector(
        ".dict-gloss-sc-table-container > table.dict-gloss-sc-table",
      ),
    ).not.toBeNull();
  });

  it("lets a wide table scroll inside its container rather than widen the card", () => {
    const { container } = renderContent({ tag: "table", content: [] });
    expect(
      container.querySelector(".dict-gloss-sc-table-container")?.className,
    ).toContain("overflow-x-auto");
  });

  it("gives an image Yomitan's class for its tag", () => {
    renderContent(
      { tag: "img", path: "a.png", alt: "a" },
      { resolveMediaUrl: resolveFakeMediaUrl },
    );
    expect(screen.getByRole("img", { name: "a" }).className).toContain(
      "dict-gloss-sc-img",
    );
  });

  it("looks up a double-clicked word of text", () => {
    const looked: string[] = [];
    renderContent("to eat", { onWordLookup: (word) => looked.push(word) });
    doubleClick(screen.getByRole("button", { name: "eat" }));
    expect(looked).toEqual(["eat"]);
  });

  it("does not make the words of a reading clickable", () => {
    renderContent({
      tag: "ruby",
      content: ["朝", { tag: "rt", content: "あさ" }],
    });
    expect(screen.queryByRole("button", { name: "あさ" })).toBeNull();
  });

  it("drops a style property outside the allowlist", () => {
    const { container } = renderContent({
      tag: "span",
      style: { cursor: "pointer" },
      content: "x",
    });
    expect(container.querySelector("[style]")).toBeNull();
  });

  it("drops a style value that loads a resource", () => {
    const { container } = renderContent({
      tag: "div",
      style: { backgroundColor: "url(https://example.com/x)" },
      content: "x",
    });
    expect(container.querySelector("[style]")).toBeNull();
  });

  it("writes data as data-sc attributes", () => {
    const { container } = renderContent({
      tag: "span",
      data: { content: "sense" },
      content: "x",
    });
    expect(container.querySelector("[data-sc-content=sense]")).not.toBeNull();
  });

  it("drops a data key that is not a plain name", () => {
    const { container } = renderContent({
      tag: "span",
      data: { "a b": "c" },
      content: "x",
    });
    const span = container.querySelector("span");
    expect(
      [...(span?.attributes ?? [])].filter(({ name }) =>
        name.startsWith("data-"),
      ),
    ).toHaveLength(0);
  });

  it("drops a lang that is not a language tag", () => {
    const { container } = renderContent({
      tag: "div",
      lang: "ja x",
      content: "x",
    });
    expect(container.querySelector("[lang]")).toBeNull();
  });

  it("looks up the query of an internal link", () => {
    const clicked: string[] = [];
    renderContent(
      { tag: "a", href: "?query=食う&wildcards=off", content: "食う" },
      { onLookup: (term) => clicked.push(term) },
    );
    fireEvent.click(screen.getByRole("button", { name: "食う" }));
    expect(clicked).toEqual(["食う"]);
  });

  it("opens an external link in a new window", () => {
    renderContent({ tag: "a", href: "https://example.com", content: "site" });
    expect(
      screen.getByRole("link", { name: "site" }).getAttribute("target"),
    ).toBe("_blank");
  });

  it("renders a javascript link as plain content", () => {
    const { container } = renderContent({
      tag: "a",
      href: "javascript:alert(1)",
      content: "x",
    });
    expect(container.querySelector("a")).toBeNull();
  });

  it("resolves an image through resolveMediaUrl", () => {
    renderContent(
      { tag: "img", path: "img/a.png", alt: "a" },
      { resolveMediaUrl: resolveFakeMediaUrl },
    );
    expect(screen.getByRole("img", { name: "a" }).getAttribute("src")).toBe(
      "media://dict/img/a.png",
    );
  });

  describe("for an image", () => {
    function renderImage(image: Omit<ImageElement, "path">) {
      return renderContent(
        { tag: "img", path: "a.png", alt: "a", ...image },
        { resolveMediaUrl: resolveFakeMediaUrl },
      );
    }

    it("wraps it in Yomitan's link, container and sizer", () => {
      const { container } = renderImage({});
      expect(
        container.querySelector(
          ".dict-gloss-image-link > .dict-gloss-image-container > .dict-gloss-image-sizer",
        ),
      ).not.toBeNull();
    });

    it("gives it Yomitan's image class", () => {
      renderImage({});
      expect(screen.getByRole("img", { name: "a" }).className).toContain(
        "dict-gloss-image",
      );
    });

    it("sizes its container in pixels when it asks for them", () => {
      const { container } = renderImage({ width: 200, height: 100 });
      const imageContainer = container.querySelector<HTMLElement>(
        ".dict-gloss-image-container",
      );
      expect(imageContainer?.style.width).toBe("200px");
    });

    it("sizes its container in the text's em, scaled to the container's smaller font", () => {
      const { container } = renderImage({
        width: 2,
        height: 1,
        sizeUnits: "em",
      });
      const imageContainer = container.querySelector<HTMLElement>(
        ".dict-gloss-image-container",
      );
      expect(imageContainer?.getAttribute("style")).toContain(
        "calc(2em * var(--dict-font-size-no-units, 14))",
      );
    });

    it("keeps its aspect ratio through the sizer as its container shrinks", () => {
      const { container } = renderImage({ width: 200, height: 100 });
      const sizer = container.querySelector<HTMLElement>(
        ".dict-gloss-image-sizer",
      );
      expect(sizer?.style.paddingTop).toBe("50%");
    });

    it("sizes an image that gives only its height by that height", () => {
      renderImage({ height: 30 });
      expect(screen.getByRole("img", { name: "a" }).style.height).toBe("30px");
    });

    it("exposes its settings through Yomitan's data attributes", () => {
      const { container } = renderImage({
        collapsible: false,
        background: false,
      });
      expect(
        container
          .querySelector(".dict-gloss-image-link")
          ?.getAttribute("data-background"),
      ).toBe("false");
    });

    it("keeps the dictionary's data attributes on its link", () => {
      const { container } = renderImage({ data: { class: "graphic" } });
      expect(
        container.querySelector(
          ".dict-gloss-image-link[data-sc-class=graphic]",
        ),
      ).not.toBeNull();
    });

    it("marks itself loaded once it loads", () => {
      const { container } = renderImage({});
      fireEvent.load(screen.getByRole("img", { name: "a" }));
      expect(
        container
          .querySelector(".dict-gloss-image-link")
          ?.getAttribute("data-image-load-state"),
      ).toBe("loaded");
    });

    it("paints a monochrome image through a mask", () => {
      const { container } = renderImage({ appearance: "monochrome" });
      const background = container.querySelector<HTMLElement>(
        ".dict-gloss-image-background",
      );
      expect(background?.getAttribute("style")).toContain("media://dict/a.png");
    });
  });

  it("hides a collapsed image until it is shown", () => {
    renderContent(
      { tag: "img", path: "a.png", alt: "a", collapsed: true },
      { resolveMediaUrl: resolveFakeMediaUrl },
    );
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("shows a collapsed image when its toggle is pressed", () => {
    renderContent(
      { tag: "img", path: "a.png", alt: "a", collapsed: true },
      { resolveMediaUrl: resolveFakeMediaUrl },
    );
    fireEvent.click(screen.getByRole("button", { name: "Show image: a" }));
    expect(screen.getByRole("img", { name: "a" })).toBeDefined();
  });
});
