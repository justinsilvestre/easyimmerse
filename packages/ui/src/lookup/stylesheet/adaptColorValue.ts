import type { CssNode, Value } from "css-tree";
import generate from "css-tree/generator";
import { clone } from "css-tree/utils";
import {
  type ColorRole,
  nonColorKeywords,
  themeAdaptedColor,
} from "./themeAdaptedColor.ts";

/** Properties whose whole value is one color. */
const colorProperties: Readonly<Record<string, ColorRole>> = {
  color: "foreground",
  "-webkit-text-fill-color": "foreground",
  "-webkit-text-stroke-color": "foreground",
  "text-decoration-color": "foreground",
  "text-emphasis-color": "foreground",
  "caret-color": "foreground",
  "background-color": "background",
};

/** Shorthands whose value may contain colors among other parts. */
const shorthandProperties: Readonly<Record<string, ColorRole>> = {
  "text-decoration": "foreground",
  "text-emphasis": "foreground",
  "-webkit-text-stroke": "foreground",
  background: "background",
};

const colorFunctions = new Set([
  "rgb",
  "rgba",
  "hsl",
  "hsla",
  "hwb",
  "lab",
  "lch",
  "oklab",
  "oklch",
  "color",
  "color-mix",
]);

/**
 * Returns the value of a color declaration with each of its colors adapted to the color scheme, or null when it holds no color to adapt.
 * Named colors are recognized only where the whole value is one color, since a shorthand's other keywords cannot be told apart from color names without a list of them.
 */
export function adaptColorValue(property: string, value: Value): string | null {
  const nodes = value.children.toArray();
  const role = colorProperties[property];
  if (role)
    return nodes.length === 1 && isColor(nodes[0] as CssNode, true)
      ? themeAdaptedColor(generate(value), role)
      : null;
  const shorthandRole = shorthandProperties[property];
  return shorthandRole ? adaptShorthand(value, shorthandRole) : null;
}

function adaptShorthand(value: Value, role: ColorRole): string | null {
  const adapted = clone(value) as Value;
  let hasColor = false;
  adapted.children.forEach((node, item, list) => {
    if (!isColor(node, false)) return;
    hasColor = true;
    const raw = themeAdaptedColor(generate(node), role);
    list.replace(item, list.createItem({ type: "Raw", value: raw }));
  });
  return hasColor ? generate(adapted) : null;
}

function isColor(node: CssNode, acceptsNames: boolean): boolean {
  if (node.type === "Hash") return true;
  if (node.type === "Function")
    return colorFunctions.has(node.name.toLowerCase());
  return (
    acceptsNames &&
    node.type === "Identifier" &&
    !nonColorKeywords.has(node.name.toLowerCase())
  );
}
