import type { CssNode, Selector, SelectorList } from "css-tree";
import generate from "css-tree/generator";
import walk from "css-tree/walker";
import { classPrefix } from "./dictionaryScope.ts";

/** Selectors that dictionaries use for the whole document, which stand for the scope root instead. */
const rootTypes = new Set(["html", "body"]);
const rootPseudoClasses = new Set(["root", "scope"]);

/** Combinators that would select siblings of the scope root, which lie outside it. */
const siblingCombinators = new Set(["+", "~"]);

/**
 * Rewrites a selector list so that every selector matches only the scope root or elements inside it, and returns it as text.
 * Selectors for the document root select the scope root instead, and class names gain the prefix that rendered dictionary markup carries.
 * Returns null when no selector of the list can be confined to the scope.
 */
export function scopeSelectorList(
  list: SelectorList,
  scope: string,
): string | null {
  const selectors = list.children
    .toArray()
    .map((selector) =>
      selector.type === "Selector" ? scopeSelector(selector, scope) : null,
    )
    .filter((selector) => selector !== null);
  return selectors.length > 0 ? selectors.join(", ") : null;
}

function scopeSelector(selector: Selector, scope: string): string | null {
  if (hasNestingSelector(selector)) return null;
  prefixClassNames(selector);
  const nodes = selector.children.toArray();
  const rootIndex = nodes.findLastIndex(isRootSelector);
  if (rootIndex < 0) return `${scope} ${generateAll(nodes)}`;
  return scopeFromRoot(nodes, rootIndex, scope);
}

/** Replaces the compound selector holding the document root with the scope root, dropping the ancestors before it. */
function scopeFromRoot(
  nodes: CssNode[],
  rootIndex: number,
  scope: string,
): string | null {
  const start = nodes.findLastIndex(
    (node, index) => index < rootIndex && node.type === "Combinator",
  );
  const end = nodes.findIndex(
    (node, index) => index > rootIndex && node.type === "Combinator",
  );
  const compoundEnd = end < 0 ? nodes.length : end;
  const next = nodes[compoundEnd];
  if (next?.type === "Combinator" && siblingCombinators.has(next.name))
    return null;
  const compound = nodes
    .slice(start + 1, compoundEnd)
    .filter((node) => !isRootSelector(node));
  return scope + generateAll([...compound, ...nodes.slice(compoundEnd)]);
}

function isRootSelector(node: CssNode): boolean {
  if (node.type === "TypeSelector")
    return rootTypes.has(node.name.toLowerCase());
  return (
    node.type === "PseudoClassSelector" &&
    rootPseudoClasses.has(node.name.toLowerCase())
  );
}

/** Prefixes class selectors and the values of `class` attribute selectors, including those nested in pseudo-classes such as `:not()`. */
function prefixClassNames(selector: Selector) {
  walk(selector, (node) => {
    if (node.type === "ClassSelector") node.name = classPrefix + node.name;
    if (
      node.type === "AttributeSelector" &&
      node.name.name.toLowerCase() === "class"
    )
      prefixClassAttributeValue(node);
  });
}

/** Prefixes the class names an attribute selector compares with. Substring and suffix matches stay as they are, since a prefix does not change them. */
function prefixClassAttributeValue(
  node: Extract<CssNode, { type: "AttributeSelector" }>,
) {
  const { value, matcher } = node;
  if (!value || matcher === "*=" || matcher === "$=") return;
  const prefixed = (text: string) =>
    matcher === "="
      ? text.replace(/(^|\s+)(?=\S)/g, `$1${classPrefix}`)
      : classPrefix + text;
  if (value.type === "String") value.value = prefixed(value.value);
  else value.name = prefixed(value.name);
}

/** Whether a selector uses `&` from CSS nesting, whose meaning depends on a parent rule that sanitizing removes. */
function hasNestingSelector(selector: Selector): boolean {
  let found = false;
  walk(selector, (node) => {
    if (node.type === "NestingSelector") found = true;
  });
  return found;
}

function generateAll(nodes: CssNode[]): string {
  return nodes.map((node) => generate(node)).join("");
}
