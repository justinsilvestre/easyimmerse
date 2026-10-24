import type { CssNode, Raw, Value } from "css-tree";
import walk from "css-tree/walker";
import type { ResolveMediaUrl } from "../definition/definitionContext.ts";
import { imageSource } from "../definition/imageSource.ts";
import { customPropertyPrefix } from "./dictionaryScope.ts";

/** Functions that compute values without loading anything or reaching outside the stylesheet. */
const allowedFunctions = new Set([
  ...["rgb", "rgba", "hsl", "hsla", "hwb", "lab", "lch", "oklab", "oklch"],
  ...["color", "color-mix", "light-dark"],
  ...["calc", "min", "max", "clamp", "round", "mod", "rem", "abs", "sign"],
  ...["var", "attr", "counter", "counters", "symbols"],
  ...["linear-gradient", "radial-gradient", "conic-gradient"],
  ...["repeating-linear-gradient", "repeating-radial-gradient"],
  ...["repeating-conic-gradient", "-webkit-linear-gradient"],
  ...["translate", "translatex", "translatey", "rotate", "scale"],
  ...["scalex", "scaley", "skew", "skewx", "skewy", "matrix"],
  ...["blur", "brightness", "contrast", "drop-shadow", "grayscale"],
  ...["hue-rotate", "invert", "opacity", "saturate", "sepia"],
  ...["cubic-bezier", "steps", "minmax", "repeat", "fit-content"],
  ...["polygon", "circle", "ellipse", "inset"],
  ...["local", "format", "tech"],
]);

/** Data URLs that hold an image or a font, which load nothing from a server. */
const embeddedResourcePattern =
  /^data:(image\/|font\/|application\/(x-)?font-)/i;

/** The dictionary whose stylesheet is being sanitized, which its media paths belong to. */
export type MediaOwner = {
  dictionaryId: string;
  resolveMediaUrl: ResolveMediaUrl;
};

/**
 * Checks a declaration's value and makes it safe in place: media paths become URLs from `resolveMediaUrl`, and custom property names gain the dictionary prefix.
 * Returns false when the value loads anything else, calls a function outside the allowlist, or holds escapes or text the parser could not read.
 */
export function sanitizeValue(value: Value | Raw, owner: MediaOwner): boolean {
  if (value.type === "Raw") return false;
  let isSafe = true;
  walk(value, (node) => {
    if (!sanitizeNode(node, owner)) isSafe = false;
  });
  return isSafe;
}

function sanitizeNode(node: CssNode, owner: MediaOwner): boolean {
  switch (node.type) {
    case "Raw":
      return false;
    case "Url":
      return resolveUrl(node, owner);
    case "Function":
      return allowedFunctions.has(node.name.toLowerCase());
    case "Identifier":
      return sanitizeIdentifier(node);
    case "Dimension":
      return !node.unit.includes("\\");
    case "Hash":
      return !node.value.includes("\\");
    default:
      return true;
  }
}

/** Rejects escaped identifiers, which could spell a keyword that checks look for, and prefixes custom property names. */
function sanitizeIdentifier(node: { name: string }): boolean {
  if (node.name.includes("\\")) return false;
  if (node.name.startsWith("--"))
    node.name = customPropertyPrefix + node.name.slice(2);
  return true;
}

function resolveUrl(node: { value: string }, owner: MediaOwner): boolean {
  if (embeddedResourcePattern.test(node.value.trim())) return true;
  const source = imageSource(node.value);
  if (source?.kind !== "media") return false;
  const url = owner.resolveMediaUrl(owner.dictionaryId, source.path);
  if (url === null) return false;
  node.value = url;
  return true;
}
