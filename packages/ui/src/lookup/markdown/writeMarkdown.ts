import type { ContentElement, ContentNode } from "./contentNode.ts";
import { markdownList } from "./markdownList.ts";
import { markdownTable } from "./markdownTable.ts";
import { writeInline, writeSingleLine } from "./writeInline.ts";

/** One block of Markdown. Lists are marked so that a list item can nest one directly under its text. */
export type MarkdownBlock = { text: string; isList: boolean };

const listTags = new Set(["ul", "ol"]);

/** Elements that stand apart from the text around them, in their own block. */
const blockTags = new Set([
  ...listTags,
  "p",
  "div",
  "section",
  "article",
  "header",
  "footer",
  "figure",
  "figcaption",
  "center",
  "blockquote",
  "pre",
  "li",
  "dl",
  "dt",
  "dd",
  "table",
  "tr",
  "hr",
  "details",
  "summary",
  "sense",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
]);

/**
 * Writes content nodes as CommonMark: blocks separated by one blank line, no trailing whitespace,
 * and never more than one blank line in a row.
 */
export function writeMarkdown(nodes: readonly ContentNode[]): string {
  return tidy(joinBlocks(blocksOf(nodes)));
}

/** Splits nodes into blocks: each block element gives one, and each run of inline nodes between them gives a paragraph. */
export function blocksOf(nodes: readonly ContentNode[]): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  let run: ContentNode[] = [];
  const endRun = () => {
    blocks.push({ text: writeInline(run).trim(), isList: false });
    run = [];
  };
  for (const node of nodes) {
    if (typeof node === "string" || !blockTags.has(node.tag)) run.push(node);
    else {
      endRun();
      blocks.push({ text: blockOf(node), isList: listTags.has(node.tag) });
    }
  }
  endRun();
  return blocks.filter((block) => block.text !== "");
}

function joinBlocks(blocks: readonly MarkdownBlock[]): string {
  return blocks.map((block) => block.text).join("\n\n");
}

function blockOf(element: ContentElement): string {
  const level = headingLevel(element.tag);
  if (level)
    return prefixed(`${"#".repeat(level)} `, writeSingleLine(element.children));
  switch (element.tag) {
    case "ul":
    case "ol":
      return markdownList(element, blocksOf);
    case "table":
      return markdownTable(element);
    case "summary":
      return wrapped("**", writeSingleLine(element.children));
    case "blockquote":
      return quote(joinBlocks(blocksOf(element.children)));
    case "hr":
      return "---";
    default:
      return joinBlocks(blocksOf(element.children));
  }
}

function headingLevel(tag: string): number | undefined {
  const level = Number(/^h([1-6])$/.exec(tag)?.[1]);
  return level || undefined;
}

function quote(text: string): string {
  return text
    .split("\n")
    .map((line) => prefixed("> ", line))
    .join("\n");
}

/** Marks a line with a prefix, leaving an empty line as it is. */
function prefixed(prefix: string, text: string): string {
  return text === "" ? "" : `${prefix}${text}`;
}

function wrapped(marker: string, text: string): string {
  return text === "" ? "" : `${marker}${text}${marker}`;
}

function tidy(text: string): string {
  return text
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
