import type { ColumnRole, TableLayout } from "@easyimmerse/types";

/** Gives the column at `index` a new role. */
export function withColumnRole(
  layout: TableLayout,
  index: number,
  role: ColumnRole,
): TableLayout {
  return {
    ...layout,
    columns: layout.columns.map((current, at) =>
      at === index ? role : current,
    ),
  };
}

/** Switches whether the table's first row is a header. */
export function withHeaderRowToggled(layout: TableLayout): TableLayout {
  return { ...layout, hasHeader: !layout.hasHeader };
}

/** Says why the layout cannot be imported yet, or null when exactly one column holds the term. */
export function termHint(layout: TableLayout): string | null {
  const termCount = layout.columns.filter((role) => role === "term").length;
  if (termCount === 0) return "Choose the column that holds the term.";
  if (termCount > 1) return "Only one column can hold the term.";
  return null;
}
