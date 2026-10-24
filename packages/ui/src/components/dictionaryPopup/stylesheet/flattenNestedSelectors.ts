import type { CssNode, Selector, SelectorList } from "css-tree";
import generate from "css-tree/generator";
import parse from "css-tree/parser";
import { clone } from "css-tree/utils";
import walk from "css-tree/walker";

/**
 * Returns the selectors that a rule nested inside another stands for, written out in full.
 * As CSS nesting defines it, `&` stands for `:is()` of the parent's selectors, and a selector without `&` selects descendants of the parent.
 * Returns null when a selector cannot be read.
 */
export function flattenNestedSelectors(
  nested: SelectorList,
  parent: SelectorList,
): SelectorList | null {
  const parentText = generate(parent);
  const selectors = nested.children.toArray().map((selector) => {
    if (selector.type !== "Selector") return null;
    return withParent(clone(selector) as Selector, parentText);
  });
  if (selectors.some((selector) => selector === null)) return null;
  return parse(selectors.join(", "), {
    context: "selectorList",
  }) as SelectorList;
}

function withParent(selector: Selector, parentText: string): string {
  const parentSelector = `:is(${parentText})`;
  let hasNestingSelector = false;
  walk(selector, (node, item, list) => {
    if (node.type !== "NestingSelector") return;
    hasNestingSelector = true;
    list.replace(item, list.createItem(isSelector(parentSelector)));
  });
  if (hasNestingSelector) return generate(selector);
  const first = selector.children.first as CssNode | null;
  const combinator = first?.type === "Combinator" ? "" : " ";
  return `${parentSelector}${combinator}${generate(selector)}`;
}

/** Parses `:is(…)` as the one node of a compound selector. */
function isSelector(text: string): CssNode {
  const selector = parse(text, { context: "selector" }) as Selector;
  return selector.children.first as CssNode;
}
