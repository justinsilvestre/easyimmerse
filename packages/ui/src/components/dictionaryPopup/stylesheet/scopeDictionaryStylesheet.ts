import type { Atrule, CssNode, Rule, SelectorList } from "css-tree";
import generate from "css-tree/generator";
import parse from "css-tree/parser";
import walk from "css-tree/walker";
import type { ResolveMediaUrl } from "../definition/definitionContext.ts";
import { dictionaryFontFamilies } from "./dictionaryFontFamilies.ts";
import { scopeAttribute } from "./dictionaryScope.ts";
import { flattenNestedSelectors } from "./flattenNestedSelectors.ts";
import {
  type StylesheetOwner,
  sanitizeDeclaration,
} from "./sanitizeDeclaration.ts";
import { scopeSelectorList } from "./scopeSelector.ts";

/** At-rules whose content is kept, sanitized like the rest of the stylesheet. Every other at-rule is dropped. */
const conditionalAtrules = new Set(["media", "supports", "container"]);

/**
 * Turns a dictionary's own stylesheet into CSS that styles only that dictionary's content, inside elements marked with its scope attribute.
 * Every selector is confined to the scope, and anything that could load a remote resource, run code, or reach outside the dictionary's content is dropped.
 * Media paths in `url()` resolve through `resolveMediaUrl`, and colors adapt to the app's dark theme.
 */
export function scopeDictionaryStylesheet(
  css: string,
  dictionaryId: string,
  resolveMediaUrl: ResolveMediaUrl,
): string {
  const stylesheet = parse(css, { parseCustomProperty: true });
  if (stylesheet.type !== "StyleSheet") return "";
  const owner: StylesheetOwner = {
    dictionaryId,
    resolveMediaUrl,
    fontFamilies: dictionaryFontFamilies(stylesheet, dictionaryId),
  };
  const scope = `[${scopeAttribute}=${generate({ type: "String", value: dictionaryId })}]`;
  // The text goes into a style element, so a string must not be able to end it, whichever way the element is created.
  return writeRules(stylesheet.children.toArray(), owner, scope).replaceAll(
    "</",
    "<\\/",
  );
}

function writeRules(
  nodes: CssNode[],
  owner: StylesheetOwner,
  scope: string,
): string {
  return nodes
    .map((node) => writeRule(node, owner, scope))
    .filter(Boolean)
    .join("\n");
}

function writeRule(
  node: CssNode,
  owner: StylesheetOwner,
  scope: string,
): string {
  if (node.type === "Rule") return writeStyleRule(node, owner, scope);
  if (node.type === "Atrule") return writeAtrule(node, owner, scope);
  return "";
}

/** Writes a style rule, followed by the rules nested inside it, each with its selectors written out in full. */
function writeStyleRule(
  rule: Rule,
  owner: StylesheetOwner,
  scope: string,
): string {
  if (rule.prelude.type !== "SelectorList") return "";
  // Nested rules read the parent's selectors before scoping rewrites them.
  const nestedRules = writeNestedRules(rule, rule.prelude, owner, scope);
  const declarations = writeDeclarations(rule.block.children.toArray(), owner);
  const selectors = scopeSelectorList(rule.prelude, scope, owner.dictionaryId);
  const ownRule =
    selectors && declarations ? `${selectors} { ${declarations} }` : "";
  return [ownRule, ...nestedRules].filter(Boolean).join("\n");
}

/** Writes the style rules nested in a rule's block. Nested at-rules are dropped. */
function writeNestedRules(
  rule: Rule,
  parent: SelectorList,
  owner: StylesheetOwner,
  scope: string,
): string[] {
  return rule.block.children.toArray().flatMap((node) => {
    if (node.type !== "Rule" || node.prelude.type !== "SelectorList") return [];
    const prelude = flattenNestedSelectors(node.prelude, parent);
    return prelude ? [writeStyleRule({ ...node, prelude }, owner, scope)] : [];
  });
}

/** Writes a block's declarations, leaving out the rules nested among them. */
function writeDeclarations(
  nodes: CssNode[],
  owner: StylesheetOwner,
  isFontFace = false,
): string {
  return nodes
    .flatMap((node) =>
      node.type === "Declaration"
        ? sanitizeDeclaration(node, owner, isFontFace)
        : [],
    )
    .map((declaration) => `${declaration};`)
    .join(" ");
}

function writeAtrule(
  rule: Atrule,
  owner: StylesheetOwner,
  scope: string,
): string {
  const name = rule.name.toLowerCase();
  const children = rule.block?.children.toArray() ?? [];
  if (name === "font-face") return writeFontFace(children, owner);
  // A layer's rules are written without it, so that they take precedence over the app's layered defaults as they would in a page of their own.
  if (name === "layer") return writeRules(children, owner, scope);
  if (!conditionalAtrules.has(name) || !hasSafePrelude(rule)) return "";
  const content = writeRules(children, owner, scope);
  return content
    ? `@${name} ${generate(rule.prelude as CssNode)} {\n${content}\n}`
    : "";
}

function writeFontFace(children: CssNode[], owner: StylesheetOwner): string {
  const descriptors = writeDeclarations(children, owner, true);
  return descriptors.includes("src:") && descriptors.includes("font-family:")
    ? `@font-face { ${descriptors} }`
    : "";
}

/** Whether a condition was read in full and loads nothing. */
function hasSafePrelude(rule: Atrule): boolean {
  if (!rule.prelude || rule.prelude.type === "Raw") return false;
  let isSafe = true;
  walk(rule.prelude, (node) => {
    if (node.type === "Raw" || node.type === "Url") isSafe = false;
  });
  return isSafe;
}
