import type { TableLayout } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import {
  termHint,
  withColumnRole,
  withHeaderRowToggled,
} from "./tableLayout.ts";

const layout: TableLayout = {
  columns: ["term", "definition"],
  hasHeader: false,
};

describe("withColumnRole", () => {
  it("gives the column at the index its new role", () => {
    expect(withColumnRole(layout, 1, "reading").columns).toEqual([
      "term",
      "reading",
    ]);
  });
});

describe("withHeaderRowToggled", () => {
  it("marks the first row as a header when it was not one", () => {
    expect(withHeaderRowToggled(layout).hasHeader).toBe(true);
  });
});

describe("termHint", () => {
  it("is null when exactly one column holds the term", () => {
    expect(termHint(layout)).toBeNull();
  });

  it("asks for a term column when there is none", () => {
    expect(termHint(withColumnRole(layout, 0, "ignored"))).toBe(
      "Choose the column that holds the term.",
    );
  });

  it("says only one column can hold the term when two do", () => {
    expect(termHint(withColumnRole(layout, 1, "term"))).toBe(
      "Only one column can hold the term.",
    );
  });
});
