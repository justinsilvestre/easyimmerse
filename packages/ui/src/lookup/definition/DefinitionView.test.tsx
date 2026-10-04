import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderDefinition } from "../../testSupport/renderDefinition.tsx";

afterEach(cleanup);

describe("DefinitionView", () => {
  it("keeps the line breaks of a text definition", () => {
    const { container } = renderDefinition({ kind: "text", text: "one\ntwo" });
    expect(container.textContent).toBe("one\ntwo");
  });

  it("makes the words of a text definition clickable", () => {
    const clicked: string[] = [];
    renderDefinition(
      { kind: "text", text: "to devour" },
      { onWordClick: (word) => clicked.push(word) },
    );
    fireEvent.click(screen.getByRole("button", { name: "devour" }));
    expect(clicked).toEqual(["devour"]);
  });

  it("looks up the base of a form-of definition", () => {
    const clicked: string[] = [];
    renderDefinition(
      { kind: "formOf", base: "行く", inflections: ["negative"] },
      { onWordClick: (word) => clicked.push(word) },
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
