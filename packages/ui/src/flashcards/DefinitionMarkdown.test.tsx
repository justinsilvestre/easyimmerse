import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DefinitionMarkdown } from "./DefinitionMarkdown.tsx";

afterEach(cleanup);

/** Renders the Markdown and returns the HTML inside the component's own wrapper. */
function renderedHtml(markdown: string) {
  const { container } = render(<DefinitionMarkdown markdown={markdown} />);
  return container.firstElementChild?.innerHTML;
}

describe("DefinitionMarkdown", () => {
  it("leaves a single paragraph unwrapped", () => {
    expect(renderedHtml("to *eat*")).toBe("to <em>eat</em>");
  });

  it("keeps the paragraphs of a longer definition", () => {
    expect(renderedHtml("one\n\ntwo")).toBe("<p>one</p>\n<p>two</p>");
  });

  it("renders a list", () => {
    expect(renderedHtml("- house\n- home")).toBe(
      "<ul>\n<li>house</li>\n<li>home</li>\n</ul>",
    );
  });

  it("shows HTML written in the Markdown as text", () => {
    expect(renderedHtml("a <b>bold</b> claim")).toBe(
      "a &lt;b&gt;bold&lt;/b&gt; claim",
    );
  });

  it("renders struck-through text", () => {
    expect(renderedHtml("~~old~~ new")).toBe("<del>old</del> new");
  });

  it("renders a table", () => {
    expect(renderedHtml("| a |\n| - |\n| b |")).toContain("<td>b</td>");
  });

  it("leaves a bare web address as text", () => {
    expect(renderedHtml("see www.example.com")).toBe("see www.example.com");
  });

  it("links to a web page", () => {
    expect(renderedHtml("[Duden](https://www.duden.de)")).toContain(
      'href="https://www.duden.de"',
    );
  });

  it("links to an email address", () => {
    expect(renderedHtml("[write](mailto:a@example.com)")).toContain(
      'href="mailto:a@example.com"',
    );
  });

  it("shows a link of another scheme as its text", () => {
    expect(renderedHtml("[run](javascript:alert(1))")).toBe("run");
  });

  it("shows a relative link as its text", () => {
    expect(renderedHtml("[page](other.html)")).toBe("page");
  });
});
