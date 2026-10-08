import type { ContentElement } from "./contentNode.ts";
import { writeSingleLine } from "./writeInline.ts";

const cellTags = new Set(["td", "th"]);

/**
 * Writes a `table` element as a Markdown table when every row has the same number of cells,
 * with the first row as the header when it is made of `th` cells and a blank header otherwise.
 * An uneven table gets one line per row, with its cells joined by " | ".
 */
export function markdownTable(table: ContentElement): string {
  const rows = rowsOf(table);
  const texts = rows.map((row) => cellsOf(row).map(cellText));
  if (texts.length === 0) return "";
  if (new Set(texts.map((cells) => cells.length)).size > 1)
    return texts.map((cells) => cells.join(" | ")).join("\n");
  const hasHeader = cellsOf(rows[0] as ContentElement).every(
    (cell) => cell.tag === "th",
  );
  const header = hasHeader ? (texts[0] ?? []) : (texts[0] ?? []).map(() => "");
  const body = hasHeader ? texts.slice(1) : texts;
  return [header, header.map(() => "---"), ...body].map(tableLine).join("\n");
}

function tableLine(cells: readonly string[]): string {
  return `| ${cells.join(" | ")} |`;
}

/** Finds the rows of a table, looking through `thead`, `tbody` and `tfoot`. */
function rowsOf(element: ContentElement): ContentElement[] {
  return element.children.flatMap((child) => {
    if (typeof child === "string") return [];
    return child.tag === "tr" ? [child] : rowsOf(child);
  });
}

function cellsOf(row: ContentElement): ContentElement[] {
  return row.children.filter(
    (child): child is ContentElement =>
      typeof child !== "string" && cellTags.has(child.tag),
  );
}

function cellText(cell: ContentElement): string {
  return writeSingleLine(cell.children).replace(/\|/g, "\\|");
}
