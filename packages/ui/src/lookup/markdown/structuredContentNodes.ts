import type { StructuredContent, StructuredElement } from "@easyimmerse/types";
import { classifyHref } from "../definition/classifyHref.ts";
import { sanitizeStyle } from "../definition/sanitizeStyle.ts";
import { type ContentNode, linkNode } from "./contentNode.ts";
import { styledChildren } from "./styledChildren.ts";

/** Reads Yomitan structured content as content nodes, leaving out images. */
export function structuredContentNodes(
  content: StructuredContent | undefined,
): ContentNode[] {
  if (content === undefined) return [];
  if (typeof content === "string") return [content];
  if (Array.isArray(content)) return content.flatMap(structuredContentNodes);
  return elementNodes(content);
}

function elementNodes(element: StructuredElement): ContentNode[] {
  switch (element.tag) {
    case "br":
      return [{ tag: "br", children: [] }];
    case "img":
      return [];
    case "a":
      return [
        linkNode(
          classifyHref(element.href),
          structuredContentNodes(element.content),
        ),
      ];
    default:
      return [
        {
          tag: element.tag,
          children: styledChildren(
            element.style && sanitizeStyle(element.style),
            structuredContentNodes(element.content),
          ),
        },
      ];
  }
}
