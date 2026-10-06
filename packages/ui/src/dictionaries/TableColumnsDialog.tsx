import type { ColumnRole, TableLayout, TablePreview } from "@easyimmerse/types";
import clsx from "clsx";
import { useId, useReducer } from "react";
import { Button } from "../components/Button.tsx";
import { CheckboxField } from "../components/CheckboxField.tsx";
import { ModalDialog } from "../components/ModalDialog.tsx";

const columnRoleLabels: Record<ColumnRole, string> = {
  term: "Term",
  reading: "Reading",
  definition: "Definition",
  alternates: "Alternate forms",
  tags: "Tags",
  frequency: "Frequency",
  ignored: "Ignore",
};

const columnRoleOptions = Object.entries(columnRoleLabels) as [
  ColumnRole,
  string,
][];

type LayoutChange =
  | { type: "columnChosen"; index: number; role: ColumnRole }
  | { type: "headerToggled" };

function changeLayout(layout: TableLayout, change: LayoutChange): TableLayout {
  switch (change.type) {
    case "columnChosen":
      return {
        ...layout,
        columns: layout.columns.map((role, index) =>
          index === change.index ? change.role : role,
        ),
      };
    case "headerToggled":
      return { ...layout, hasHeader: !layout.hasHeader };
  }
}

/** Shows the first rows of a table file with what each column holds, detected by the app, for the user to correct before importing. */
export function TableColumnsDialog({
  fileName,
  preview,
  onImport,
  onCancel,
}: {
  fileName: string;
  preview: TablePreview;
  onImport: (layout: TableLayout) => void;
  onCancel: () => void;
}) {
  const [layout, dispatch] = useReducer(changeLayout, preview.layout);
  const hintId = useId();
  const termCount = layout.columns.filter((role) => role === "term").length;
  const hint = termHint(termCount);
  return (
    <ModalDialog
      title={`Import ${fileName}`}
      description="Check what each column holds. Only the first rows are shown."
      onCancel={onCancel}
      isWide
      footer={
        <>
          <Button onClick={onCancel}>Cancel</Button>
          <Button
            variant="primary"
            disabled={hint !== null}
            aria-describedby={hint ? hintId : undefined}
            onClick={() => onImport(layout)}
          >
            Import
          </Button>
        </>
      }
    >
      <div className="overflow-x-auto rounded-md border border-line">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-surface-muted">
            <tr>
              {layout.columns.map((role, index) => (
                <th
                  // The columns never move, so their positions identify them.
                  // biome-ignore lint/suspicious/noArrayIndexKey: see above
                  key={index}
                  scope="col"
                  className="min-w-28 p-1.5 text-left font-normal"
                >
                  <select
                    aria-label={`Column ${index + 1}`}
                    value={role}
                    onChange={(event) =>
                      dispatch({
                        type: "columnChosen",
                        index,
                        role: event.target.value as ColumnRole,
                      })
                    }
                    className="w-full rounded border border-line-strong bg-surface px-1.5 py-1 text-xs font-medium text-fg focus:border-accent focus:outline-2 focus:outline-accent/30"
                  >
                    {columnRoleOptions.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.rows.map((row, rowIndex) => (
              <tr
                // biome-ignore lint/suspicious/noArrayIndexKey: the preview rows never change order.
                key={rowIndex}
                className={clsx(
                  "border-t border-line",
                  rowIndex === 0 &&
                    layout.hasHeader &&
                    "bg-surface-muted font-medium text-fg-muted",
                )}
              >
                {layout.columns.map((role, index) => (
                  <td
                    // biome-ignore lint/suspicious/noArrayIndexKey: the columns never move.
                    key={index}
                    className={clsx(
                      "px-2 py-1.5",
                      role === "ignored" && "text-fg-faint line-through",
                    )}
                  >
                    <div className="max-w-48 truncate" title={row[index]}>
                      {row[index]}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CheckboxField
        label="First row is a header"
        checked={layout.hasHeader}
        onChange={() => dispatch({ type: "headerToggled" })}
      />
      {hint && (
        <p id={hintId} className="text-xs text-fg-muted">
          {hint}
        </p>
      )}
    </ModalDialog>
  );
}

function termHint(termCount: number): string | null {
  if (termCount === 0) return "Choose the column that holds the term.";
  if (termCount > 1) return "Only one column can hold the term.";
  return null;
}
