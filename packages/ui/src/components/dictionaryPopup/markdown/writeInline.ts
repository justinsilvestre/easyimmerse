import type { ContentNode } from "./contentNode.ts";

/**
 * Writes a run of inline nodes as one Markdown paragraph, with each line trimmed.
 * A `br` becomes a plain newline rather than a hard break with trailing spaces,
 * which keeps the text readable as it is and free of trailing whitespace.
 * A block element met here, inside an inline element, contributes only its text.
 */
export function writeInline(nodes: readonly ContentNode[]): string {
  return inlineText(nodes)
    .split("\n")
    .map((line) => line.trim())
    .join("\n");
}

/** Writes inline nodes on a single line, for a heading, a summary or a table cell. */
export function writeSingleLine(nodes: readonly ContentNode[]): string {
  return inlineText(nodes).replace(/\s+/g, " ").trim();
}

/** Writes inline nodes with their whitespace collapsed but not yet trimmed, so that an enclosing element can place its markers. */
function inlineText(nodes: readonly ContentNode[]): string {
  return nodes.map(inlineNode).join("");
}

function inlineNode(node: ContentNode): string {
  if (typeof node === "string") return node.replace(/\s+/g, " ");
  switch (node.tag) {
    case "br":
      return "\n";
    case "rt":
    case "rp":
      return "";
    case "b":
    case "strong":
      return wrap(inlineText(node.children), "**");
    case "i":
    case "em":
      return wrap(inlineText(node.children), "*");
    case "code":
      return wrap(inlineText(node.children), "`");
    case "a":
      return link(inlineText(node.children), node.href);
    default:
      return inlineText(node.children);
  }
}

/** Puts a marker around the text, leaving its surrounding whitespace outside, where CommonMark requires it. */
function wrap(text: string, marker: string): string {
  const [, lead = "", body = "", trail = ""] =
    /^(\s*)([\s\S]*?)(\s*)$/.exec(text) ?? [];
  return body ? `${lead}${marker}${body}${marker}${trail}` : text;
}

function link(text: string, href: string | undefined): string {
  if (href === undefined || text.trim() === "") return text;
  return `[${text.trim()}](${href})`;
}
