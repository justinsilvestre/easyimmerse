import type { StructuredContent } from "@easyimmerse/types";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
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

  it("makes the words of text clickable", () => {
    const clicked: string[] = [];
    renderContent("to eat", { onWordClick: (word) => clicked.push(word) });
    fireEvent.click(screen.getByRole("button", { name: "eat" }));
    expect(clicked).toEqual(["eat"]);
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
    expect(container.querySelector("span")?.attributes).toHaveLength(0);
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

  it("sizes an image in the units it asks for", () => {
    renderContent(
      {
        tag: "img",
        path: "a.png",
        alt: "a",
        width: 2,
        height: 1,
        sizeUnits: "em",
      },
      { resolveMediaUrl: resolveFakeMediaUrl },
    );
    expect(screen.getByRole("img", { name: "a" }).style.width).toBe("2em");
  });

  it("paints a monochrome image through a mask", () => {
    renderContent(
      { tag: "img", path: "a.svg", alt: "glyph", appearance: "monochrome" },
      { resolveMediaUrl: resolveFakeMediaUrl },
    );
    expect(screen.getByRole("img", { name: "glyph" }).tagName).toBe("SPAN");
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
