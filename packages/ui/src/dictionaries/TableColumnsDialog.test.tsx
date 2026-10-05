import type { TableLayout, TablePreview } from "@easyimmerse/types";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TableColumnsDialog } from "./TableColumnsDialog.tsx";

afterEach(cleanup);

const germanPreview: TablePreview = {
  layout: { columns: ["term", "definition"], hasHeader: false },
  rows: [
    ["Wort", "Bedeutung"],
    ["Hund", "dog"],
  ],
};

function renderDialog(preview: TablePreview = germanPreview) {
  const imported: TableLayout[] = [];
  let cancelled = 0;
  render(
    <TableColumnsDialog
      fileName="wortschatz.csv"
      preview={preview}
      onImport={(layout) => imported.push(layout)}
      onCancel={() => {
        cancelled += 1;
      }}
    />,
  );
  return { imported, wasCancelled: () => cancelled > 0 };
}

const importButton = () => screen.getByRole("button", { name: "Import" });
const chooseRole = (column: number, role: string) =>
  fireEvent.change(screen.getByRole("combobox", { name: `Column ${column}` }), {
    target: { value: role },
  });

describe("TableColumnsDialog", () => {
  it("prefills each column with its detected role", () => {
    renderDialog();
    expect(screen.getByRole("combobox", { name: "Column 2" })).toHaveProperty(
      "value",
      "definition",
    );
  });

  it("shows the cells of the first rows", () => {
    renderDialog();
    expect(screen.getByRole("cell", { name: "Bedeutung" })).toBeDefined();
  });

  it("imports the detected layout when nothing is changed", () => {
    const { imported } = renderDialog();
    fireEvent.click(importButton());
    expect(imported).toEqual([germanPreview.layout]);
  });

  it("imports the roles and header the user chose", () => {
    const { imported } = renderDialog();
    chooseRole(2, "ignored");
    fireEvent.click(
      screen.getByRole("checkbox", { name: "First row is a header" }),
    );
    fireEvent.click(importButton());
    expect(imported).toEqual([
      { columns: ["term", "ignored"], hasHeader: true },
    ]);
  });

  it("disables Import while no column is the term", () => {
    renderDialog();
    chooseRole(1, "definition");
    expect(importButton()).toHaveProperty("disabled", true);
  });

  it("explains why Import is disabled", () => {
    renderDialog();
    chooseRole(1, "definition");
    expect(
      screen.getByRole("button", {
        name: "Import",
        description: "Choose the column that holds the term.",
      }),
    ).toBeDefined();
  });

  it("disables Import while two columns are the term", () => {
    renderDialog();
    chooseRole(2, "term");
    expect(importButton()).toHaveProperty("disabled", true);
  });

  it("calls onCancel when Cancel is clicked", () => {
    const { wasCancelled } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(wasCancelled()).toBe(true);
  });
});
