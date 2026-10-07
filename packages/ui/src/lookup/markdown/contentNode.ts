import type { LinkTarget } from "../definition/classifyHref.ts";

/**
 * A node of dictionary content reduced to what Markdown can express: text, or an element with its tag and children.
 * Tags are HTML tag names and the kinds of `RichElement`, which both adapters produce, so that one writer serves every definition format.
 */
export type ContentNode = string | ContentElement;

export type ContentElement = {
  tag: string;
  children: ContentNode[];
  /** The URL of an external link; set only on `a` elements. */
  href?: string;
};

/** Keeps the text of an internal link, and the link itself when it leads to an external page. */
export function linkNode(
  target: LinkTarget,
  children: ContentNode[],
): ContentElement {
  return target.kind === "external"
    ? { tag: "a", href: target.url, children }
    : { tag: "span", children };
}
