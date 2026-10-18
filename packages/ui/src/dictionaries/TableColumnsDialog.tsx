import type { ColumnRole, TableLayout, TablePreview } from "@easyimmerse/types";
import clsx from "clsx";
import { useId } from "react";
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

/** Shows the first rows of a table file with what each column holds, first as detected by the app, for the user to correct before importing. */
export function TableColumnsDialog({
  fileName,
  preview,
  layout,
  hint,
  onColumnRoleChosen,
  onHeaderRowToggled,
  onImport,
  onCancel,
}: {
  fileName: string;
  preview: TablePreview;
  /** What each column holds and whether the first row is a header, as set so far. */
  layout: TableLayout;
  /** Why the table cannot be imported with this layout, or null when it can. */
  hint: string | null;
  onColumnRoleChosen: (index: number, role: ColumnRole) => void;
  onHeaderRowToggled: () => void;
  onImport: () => void;
  onCancel: () => void;
}) {
  const hintId = useId();
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
            onClick={onImport}
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
                      onColumnRoleChosen(
                        index,
                        event.target.value as ColumnRole,
                      )
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
        onChange={onHeaderRowToggled}
      />
      {hint && (
        <p id={hintId} className="text-xs text-fg-muted">
          {hint}
        </p>
      )}
    </ModalDialog>
  );
}
