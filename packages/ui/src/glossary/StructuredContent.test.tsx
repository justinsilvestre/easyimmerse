import { resetBackend } from "@easyimmerse/backend";
import { actions, selectLookup } from "@easyimmerse/state";
import type { StructuredContent as Content } from "@easyimmerse/types";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { fixtureStructuredImageUrl } from "../testSupport/fixtureStructuredLookup.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { StructuredContent } from "./StructuredContent.tsx";

afterEach(() => {
  cleanup();
  resetBackend();
});

function renderContent(content: Content) {
  const rendered = renderWithAppStore(
    <div data-testid="content">
      <StructuredContent content={content} dictionaryId="d3" />
    </div>,
  );
  act(() => rendered.store.dispatch(actions.lookupOpenedForTyping()));
  return rendered;
}

const findRoot = () => screen.getByTestId("content");

const findElement = (selector: string) =>
  findRoot().querySelector(selector) as HTMLElement;

describe("StructuredContent", () => {
  it("shows a text node", () => {
    renderContent("cat");
    expect(findRoot().textContent).toBe("cat");
  });

  it("shows each node of a list in order", () => {
    renderContent(["black ", { tag: "span", content: "cat" }]);
    expect(findRoot().textContent).toBe("black cat");
  });

  it("renders a line break", () => {
    renderContent(["a", { tag: "br" }, "b"]);
    expect(findElement("br")).not.toBeNull();
  });

  it("renders ruby with its reading", () => {
    renderContent({
      tag: "ruby",
      content: ["猫", { tag: "rt", content: "ねこ" }],
    });
    expect(findElement("ruby > rt").textContent).toBe("ねこ");
  });

  it("renders nested lists", () => {
    renderContent({
      tag: "ul",
      content: {
        tag: "li",
        content: { tag: "ol", content: { tag: "li", content: "a" } },
      },
    });
    expect(findElement("ul > li > ol > li").textContent).toBe("a");
  });

  it("renders a table cell spanning columns", () => {
    renderContent({
      tag: "table",
      content: { tag: "tr", content: { tag: "td", colSpan: 2, content: "a" } },
    });
    expect(findElement("td").getAttribute("colspan")).toBe("2");
  });

  it("puts rows outside a table section into a table body", () => {
    renderContent({ tag: "table", content: { tag: "tr", content: "a" } });
    expect(findElement("table > tbody > tr")).not.toBeNull();
  });

  it("renders a table cell spanning rows", () => {
    renderContent({
      tag: "table",
      content: { tag: "tr", content: { tag: "th", rowSpan: 3, content: "a" } },
    });
    expect(findElement("th").getAttribute("rowspan")).toBe("3");
  });

  it("sets the language of an element", () => {
    renderContent({ tag: "span", lang: "ja", content: "猫" });
    expect(findElement("span").lang).toBe("ja");
  });

  it("sets the hover text of a styled element", () => {
    renderContent({ tag: "span", title: "noun", content: "n" });
    expect(findElement("span").title).toBe("noun");
  });

  it("opens a details element that starts open", () => {
    renderContent({
      tag: "details",
      open: true,
      content: [{ tag: "summary", content: "More" }, "text"],
    });
    expect(findElement("details").hasAttribute("open")).toBe(true);
  });

  describe("for an element's data", () => {
    it("sets a data-sc attribute for each key", () => {
      renderContent({ tag: "div", data: { content: "sense" }, content: "a" });
      expect(findElement("div").getAttribute("data-sc-content")).toBe("sense");
    });

    it("writes a camel-case key in kebab case, as dataset does", () => {
      renderContent({ tag: "br", data: { sourceType: "jmdict" } });
      expect(findElement("br").getAttribute("data-sc-source-type")).toBe(
        "jmdict",
      );
    });
  });

  describe("for an element's style", () => {
    const renderStyled = (style: object) =>
      renderContent({ tag: "span", style, content: "a" });

    it("applies the style inline", () => {
      renderStyled({ fontWeight: "bold" });
      expect(findElement("span").style.fontWeight).toBe("bold");
    });

    it("reads a numeric margin in em", () => {
      renderStyled({ marginLeft: 1.5 });
      expect(findElement("span").style.marginLeft).toBe("1.5em");
    });

    it("keeps a margin given as a CSS length", () => {
      renderStyled({ marginTop: "4px" });
      expect(findElement("span").style.marginTop).toBe("4px");
    });

    it("joins several text decoration lines", () => {
      renderStyled({ textDecorationLine: ["underline", "overline"] });
      expect(findElement("span").style.textDecorationLine).toBe(
        "underline overline",
      );
    });

    it("drops a value that would load a remote resource", () => {
      renderStyled({ background: "url(https://example.com/a.png)" });
      expect(findElement("span").style.background).toBe("");
    });
  });

  describe("for a link", () => {
    const searchLink = {
      tag: "a",
      href: "?query=%E4%B8%80%E3%81%AE%E5%AD%97%E7%82%B9&wildcards=off&primary_reading=%E3%81%84%E3%81%A1%E3%81%AE%E3%81%98%E3%81%A6%E3%82%93",
      content: "一の字点",
    } as const;

    it("looks up the query of a search link", () => {
      const { store } = renderContent(searchLink);
      fireEvent.click(screen.getByRole("button", { name: "一の字点" }));
      expect(selectLookup(store.getState())).toMatchObject({
        term: "一の字点",
      });
    });

    it("prefers the primary reading of a search link", () => {
      const { store } = renderContent(searchLink);
      fireEvent.click(screen.getByRole("button", { name: "一の字点" }));
      expect(selectLookup(store.getState())).toMatchObject({
        preferredReading: "いちのじてん",
      });
    });

    it("opens a web link outside the app", () => {
      const { effects } = renderContent({
        tag: "a",
        href: "https://jitendex.org",
        content: "Jitendex",
      });
      fireEvent.click(screen.getByRole("link", { name: /Jitendex/ }));
      expect(effects.calls).toContainEqual({
        type: "openExternalUrl",
        url: "https://jitendex.org",
      });
    });

    it("shows a link with another scheme as plain text", () => {
      renderContent({ tag: "a", href: "javascript:alert(1)", content: "x" });
      expect(screen.queryByRole("link")).toBeNull();
    });
  });

  describe("for an image", () => {
    const image = {
      tag: "img",
      path: "img/cat.svg",
      width: 2,
      height: 1,
      sizeUnits: "em",
      alt: "a cat",
    } as const;

    it("loads the image from the dictionary", () => {
      renderContent(image);
      expect(
        screen.getByRole("img", { name: "a cat" }).getAttribute("src"),
      ).toBe(fixtureStructuredImageUrl);
    });

    it("sizes the image in the given units", () => {
      renderContent(image);
      expect(screen.getByRole("img", { name: "a cat" }).style.width).toBe(
        "2em",
      );
    });

    it("measures a size in pixels when no units are given", () => {
      renderContent({ ...image, sizeUnits: undefined });
      expect(screen.getByRole("img", { name: "a cat" }).style.width).toBe(
        "2px",
      );
    });

    it("hides a collapsed image behind a summary", () => {
      renderContent({ ...image, collapsed: true });
      expect(findElement("details > summary").textContent).toBe("Image");
    });
  });
});
