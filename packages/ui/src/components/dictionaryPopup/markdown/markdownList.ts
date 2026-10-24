import type { ContentElement, ContentNode } from "./contentNode.ts";
import type { MarkdownBlock } from "./writeMarkdown.ts";

/**
 * Writes a `ul` or `ol` element as a Markdown list.
 * Each child but the whitespace between items becomes an item, whose further lines are indented by the width of its marker,
 * so that nested lists and blocks stay inside it.
 * A nested list follows the item's text directly; other blocks are set off by a blank line.
 */
export function markdownList(
  list: ContentElement,
  blocksOf: (nodes: readonly ContentNode[]) => MarkdownBlock[],
): string {
  return list.children
    .filter((item) => typeof item !== "string" || item.trim() !== "")
    .map((item, index) => listItem(item, marker(list.tag, index), blocksOf))
    .filter((item) => item !== "")
    .join("\n");
}

function marker(tag: string, index: number): string {
  return tag === "ol" ? `${index + 1}. ` : "- ";
}

function listItem(
  item: ContentNode,
  marker: string,
  blocksOf: (nodes: readonly ContentNode[]) => MarkdownBlock[],
): string {
  const children =
    typeof item === "string" || item.tag !== "li" ? [item] : item.children;
  const body = joinItemBlocks(blocksOf(children));
  if (body === "") return "";
  const indent = " ".repeat(marker.length);
  return marker + body.replace(/\n(?!\n)/g, `\n${indent}`);
}

function joinItemBlocks(blocks: readonly MarkdownBlock[]): string {
  return blocks.reduce(
    (text, block) =>
      text === ""
        ? block.text
        : `${text}${block.isList ? "\n" : "\n\n"}${block.text}`,
    "",
  );
}
