import type { CSSProperties } from "react";
import type { ContentNode } from "./contentNode.ts";

/**
 * Applies what an element's sanitized style shows of it in Markdown: its children are wrapped in bold or italic elements
 * when the style asks for either, and get a space on each side where a horizontal margin or padding sets them apart from their neighbours.
 */
export function styledChildren(
  style: CSSProperties | undefined,
  children: ContentNode[],
): ContentNode[] {
  if (style === undefined) return children;
  let nodes = children;
  if (isItalic(style.fontStyle)) nodes = [{ tag: "i", children: nodes }];
  if (isBold(style.fontWeight)) nodes = [{ tag: "b", children: nodes }];
  const [left, right] = horizontalSpacing(style);
  return [...(left ? [" "] : []), ...nodes, ...(right ? [" "] : [])];
}

function isBold(weight: CSSProperties["fontWeight"]): boolean {
  return weight === "bold" || weight === "bolder" || Number(weight) >= 600;
}

function isItalic(style: CSSProperties["fontStyle"]): boolean {
  return style === "italic" || style === "oblique";
}

/** Whether the style leaves room on the left and on the right, through a margin or padding of either side or a shorthand. */
function horizontalSpacing(style: CSSProperties): [boolean, boolean] {
  const [marginLeft, marginRight] = shorthandSides(style.margin);
  const [paddingLeft, paddingRight] = shorthandSides(style.padding);
  return [
    [style.marginLeft ?? marginLeft, style.paddingLeft ?? paddingLeft].some(
      isLength,
    ),
    [style.marginRight ?? marginRight, style.paddingRight ?? paddingRight].some(
      isLength,
    ),
  ];
}

/** Reads the left and right values of a shorthand with one to four values, in CSS order: all, vertical horizontal, top horizontal bottom, or top right bottom left. */
function shorthandSides(
  shorthand: string | number | undefined,
): [string | undefined, string | undefined] {
  if (shorthand === undefined) return [undefined, undefined];
  const [all, horizontal, , left] = String(shorthand).trim().split(/\s+/);
  const right = horizontal ?? all;
  return [left ?? right, right];
}

function isLength(value: string | number | undefined): boolean {
  return Number.parseFloat(String(value)) > 0;
}
