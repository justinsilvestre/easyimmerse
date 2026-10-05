import type { CssNode, Selector, SelectorList } from "css-tree";
import generate from "css-tree/generator";
import { ident } from "css-tree/utils";
import walk from "css-tree/walker";
import { classPrefix, elementIdPrefix } from "./dictionaryScope.ts";

/** Selectors that dictionaries use for the whole document, which stand for the scope root instead. */
const rootTypes = new Set(["html", "body"]);
const rootPseudoClasses = new Set(["root", "scope"]);

/** Combinators that would select siblings of the scope root, which lie outside it. */
const siblingCombinators = new Set(["+", "~"]);

/**
 * Rewrites a selector list so that every selector matches only the scope root or elements inside it, and returns it as text.
 * Selectors for the document root select the scope root instead, and class names and ids gain the prefixes that rendered dictionary markup carries.
 * Returns null when no selector of the list can be confined to the scope.
 */
export function scopeSelectorList(
  list: SelectorList,
  scope: string,
  dictionaryId: string,
): string | null {
  const selectors = list.children
    .toArray()
    .map((selector) =>
      selector.type === "Selector"
        ? scopeSelector(selector, scope, dictionaryId)
        : null,
    )
    .filter((selector) => selector !== null);
  return selectors.length > 0 ? selectors.join(", ") : null;
}

function scopeSelector(
  selector: Selector,
  scope: string,
  dictionaryId: string,
): string | null {
  if (hasNestingSelector(selector)) return null;
  prefixNames(selector, elementIdPrefix(dictionaryId));
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

/**
 * Prefixes class names and ids in selectors and in `class` and `id` attribute selectors, including those nested in pseudo-classes such as `:not()`.
 * Ids gain `idPrefix`, which names the dictionary.
 */
function prefixNames(selector: Selector, idPrefix: string) {
  walk(selector, (node) => {
    if (node.type === "ClassSelector") node.name = classPrefix + node.name;
    if (node.type === "IdSelector")
      node.name = ident.encode(idPrefix) + node.name;
    if (node.type !== "AttributeSelector") return;
    const attribute = node.name.name.toLowerCase();
    if (attribute === "class")
      prefixAttributeValue(node, (text) =>
        node.matcher === "=" ? prefixEachClassName(text) : classPrefix + text,
      );
    if (attribute === "id")
      prefixAttributeValue(node, (text) => idPrefix + text);
  });
}

/** Prefixes the value an attribute selector compares with. Substring and suffix matches stay as they are, since a prefix does not change them. */
function prefixAttributeValue(
  node: Extract<CssNode, { type: "AttributeSelector" }>,
  prefix: (text: string) => string,
) {
  const { value, matcher } = node;
  if (!value || matcher === "*=" || matcher === "$=") return;
  if (value.type === "String") value.value = prefix(value.value);
  else value.name = ident.encode(prefix(ident.decode(value.name)));
}

function prefixEachClassName(classNames: string): string {
  return classNames.replace(/(^|\s+)(?=\S)/g, `$1${classPrefix}`);
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
