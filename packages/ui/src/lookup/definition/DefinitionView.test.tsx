import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { doubleClick } from "../../testSupport/doubleClick.ts";
import { renderDefinition } from "../../testSupport/renderDefinition.tsx";

afterEach(cleanup);

describe("DefinitionView", () => {
  it("renders the definition inside its dictionary's scope", () => {
    const { container } = renderDefinition({ kind: "text", text: "cat" });
    expect(
      container.querySelector('[data-dictionary-scope="dict"]')?.textContent,
    ).toBe("cat");
  });

  it("keeps the line breaks of a text definition", () => {
    const { container } = renderDefinition({ kind: "text", text: "one\ntwo" });
    expect(container.textContent).toBe("one\ntwo");
  });

  it("keeps angle-bracketed text in a text definition", () => {
    const { container } = renderDefinition({
      kind: "text",
      text: "<colloq.> mate",
    });
    expect(container.textContent).toBe("<colloq.> mate");
  });

  it("looks up a double-clicked word of a text definition", () => {
    const looked: string[] = [];
    renderDefinition(
      { kind: "text", text: "to devour" },
      { onWordLookup: (word) => looked.push(word) },
    );
    doubleClick(screen.getByRole("button", { name: "devour" }));
    expect(looked).toEqual(["devour"]);
  });

  it("looks nothing up for a word of a text definition clicked once", () => {
    const looked: string[] = [];
    renderDefinition(
      { kind: "text", text: "to devour" },
      { onWordLookup: (word) => looked.push(word) },
    );
    fireEvent.click(screen.getByRole("button", { name: "devour" }), {
      detail: 1,
    });
    expect(looked).toEqual([]);
  });

  it("looks up the base of a form-of definition", () => {
    const clicked: string[] = [];
    renderDefinition(
      { kind: "formOf", base: "行く", inflections: ["negative"] },
      { onLookup: (term) => clicked.push(term) },
    );
    fireEvent.click(screen.getByRole("button", { name: "行く" }));
    expect(clicked).toEqual(["行く"]);
  });

  it("lists the inflections of a form-of definition", () => {
    const { container } = renderDefinition({
      kind: "formOf",
      base: "行く",
      inflections: ["negative", "polite"],
    });
    expect(container.textContent).toBe(
      "inflected form of 行く (negative, polite)",
    );
  });
});
