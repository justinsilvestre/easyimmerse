import type { CssNode, StyleSheet, Value } from "css-tree";
import { List } from "css-tree/utils";
import walk from "css-tree/walker";

/**
 * Maps each font family that a stylesheet's `@font-face` rules declare, lowercased, to a name unique to the dictionary.
 * Font family names are global to the page, so a dictionary's own font must not replace the app's font of the same name, or another dictionary's.
 */
export function dictionaryFontFamilies(
  stylesheet: StyleSheet,
  dictionaryId: string,
): ReadonlyMap<string, string> {
  const families = new Map<string, string>();
  walk(stylesheet, {
    visit: "Atrule",
    enter(rule) {
      if (rule.name.toLowerCase() !== "font-face" || !rule.block) return;
      for (const name of declaredFamilies(rule.block.children.toArray()))
        families.set(name.toLowerCase(), `${dictionaryId} ${name}`);
    },
  });
  return families;
}

function declaredFamilies(declarations: CssNode[]): string[] {
  return declarations.flatMap((declaration) => {
    if (declaration.type !== "Declaration") return [];
    if (declaration.property.toLowerCase() !== "font-family") return [];
    if (declaration.value.type !== "Value") return [];
    return [familyName(declaration.value.children.toArray())];
  });
}

/** Replaces each family that the dictionary declares with its unique name, in a `font-family` value or the family list ending a `font` value. */
export function renameFontFamilies(
  value: Value,
  families: ReadonlyMap<string, string>,
) {
  const groups = splitByComma(value.children.toArray());
  const renamed = groups.map((group) => {
    const unique = families.get(familyName(lastFamily(group)).toLowerCase());
    if (!unique) return group;
    const prefix = group.slice(0, group.length - lastFamily(group).length);
    return [...prefix, { type: "String", value: unique } as CssNode];
  });
  value.children = new List<CssNode>().fromArray(joinWithCommas(renamed));
}

/** Reads a family written as one string or as a run of identifiers. */
function familyName(nodes: CssNode[]): string {
  if (nodes.length === 1 && nodes[0]?.type === "String") return nodes[0].value;
  return nodes
    .map((node) => (node.type === "Identifier" ? node.name : ""))
    .join(" ");
}

/** Returns the trailing nodes of a comma-separated group that can name a family, so that the size and style before it in a `font` value stay as they are. */
function lastFamily(group: CssNode[]): CssNode[] {
  const last = group.at(-1);
  if (last?.type === "String") return [last];
  const start = group.findLastIndex((node) => node.type !== "Identifier");
  return group.slice(start + 1);
}

function splitByComma(nodes: CssNode[]): CssNode[][] {
  const groups: CssNode[][] = [[]];
  for (const node of nodes) {
    if (node.type === "Operator" && node.value === ",") groups.push([]);
    else groups.at(-1)?.push(node);
  }
  return groups;
}

function joinWithCommas(groups: CssNode[][]): CssNode[] {
  return groups.flatMap((group, index) =>
    index === 0
      ? group
      : [{ type: "Operator", value: "," } as CssNode, ...group],
  );
}
