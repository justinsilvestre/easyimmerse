import type { MarkupLanguage } from "../definition/markupRule.ts";
import { markupRuleFor } from "../definition/markupRuleFor.ts";
import { parseMarkup } from "../definition/parseMarkup.ts";
import { type ContentNode, linkNode } from "./contentNode.ts";
import { styledChildren } from "./styledChildren.ts";

const lineBreak: ContentNode = { tag: "br", children: [] };

/**
 * Reads HTML, Pango or XDXF markup as content nodes by the same rules that render it, so that dropped elements, links and styles come out the same.
 * Images and sounds are left out.
 */
export function markupContentNodes(
  markup: string,
  language: MarkupLanguage,
): ContentNode[] {
  const nodes = parseMarkup(markup, language === "html" ? "html" : "xml");
  return nodes.flatMap((node) => contentNodes(node, language));
}

function contentNodes(node: Node, language: MarkupLanguage): ContentNode[] {
  if (
    node.nodeType === Node.TEXT_NODE ||
    node.nodeType === Node.CDATA_SECTION_NODE
  )
    return textNodes(node.textContent ?? "", language !== "html");
  if (node.nodeType !== Node.ELEMENT_NODE) return [];
  return elementNodes(node as Element, language);
}

function elementNodes(element: Element, language: MarkupLanguage) {
  const rule = markupRuleFor(element, language);
  const children = () =>
    [...element.childNodes].flatMap((child) => contentNodes(child, language));
  switch (rule.action) {
    case "drop":
    case "sound":
    case "image":
      return [];
    case "unwrap":
      return children();
    case "link":
      return [linkNode(rule.target, children())];
    case "element":
      return [
        {
          tag: rule.kind,
          children: styledChildren(rule.attributes?.style, children()),
        },
      ];
  }
}

/** Pango and XDXF keep the line breaks written in their text, so each one becomes a line break. */
function textNodes(text: string, keepsLineBreaks: boolean): ContentNode[] {
  if (!keepsLineBreaks) return [text];
  return text
    .split("\n")
    .flatMap((line, index) => (index === 0 ? [line] : [lineBreak, line]));
}
