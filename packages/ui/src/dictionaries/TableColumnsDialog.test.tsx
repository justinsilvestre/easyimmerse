import type { ColumnRole, TablePreview } from "@easyimmerse/types";
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

function renderDialog(hint: string | null = null) {
  const events: unknown[] = [];
  render(
    <TableColumnsDialog
      fileName="wortschatz.csv"
      preview={germanPreview}
      layout={germanPreview.layout}
      hint={hint}
      onColumnRoleChosen={(index: number, role: ColumnRole) =>
        events.push({ index, role })
      }
      onHeaderRowToggled={() => events.push("headerRowToggled")}
      onImport={() => events.push("import")}
      onCancel={() => events.push("cancel")}
    />,
  );
  return events;
}

const importButton = () => screen.getByRole("button", { name: "Import" });
const noTermHint = "Choose the column that holds the term.";

describe("TableColumnsDialog", () => {
  it("shows each column's role", () => {
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

  it("reports the role chosen for a column", () => {
    const events = renderDialog();
    fireEvent.change(screen.getByRole("combobox", { name: "Column 2" }), {
      target: { value: "ignored" },
    });
    expect(events).toEqual([{ index: 1, role: "ignored" }]);
  });

  it("reports that the header row was switched", () => {
    const events = renderDialog();
    fireEvent.click(
      screen.getByRole("checkbox", { name: "First row is a header" }),
    );
    expect(events).toEqual(["headerRowToggled"]);
  });

  it("asks to import when Import is clicked", () => {
    const events = renderDialog();
    fireEvent.click(importButton());
    expect(events).toEqual(["import"]);
  });

  it("disables Import while there is a hint", () => {
    renderDialog(noTermHint);
    expect(importButton()).toHaveProperty("disabled", true);
  });

  it("explains why Import is disabled", () => {
    renderDialog(noTermHint);
    expect(
      screen.getByRole("button", { name: "Import", description: noTermHint }),
    ).toBeDefined();
  });

  it("reports Cancel", () => {
    const events = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(events).toEqual(["cancel"]);
  });
});
