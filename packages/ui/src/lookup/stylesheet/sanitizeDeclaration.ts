import type { Declaration, Value } from "css-tree";
import generate from "css-tree/generator";
import walk from "css-tree/walker";
import { adaptColorValue } from "./adaptColorValue.ts";
import { renameFontFamilies } from "./dictionaryFontFamilies.ts";
import { customPropertyPrefix } from "./dictionaryScope.ts";
import { type MediaOwner, sanitizeValue } from "./sanitizeValue.ts";

/** The dictionary a stylesheet belongs to, and the font families it declares. */
export type StylesheetOwner = MediaOwner & {
  fontFamilies: ReadonlyMap<string, string>;
};

/**
 * Properties that run code, make content editable, follow the system color scheme instead of the app's theme, or use names global to the page:
 * keyframes, anchors and view transitions.
 */
const deniedProperties = new Set([
  "behavior",
  "-ms-behavior",
  "-moz-binding",
  "-webkit-user-modify",
  "user-modify",
  "color-scheme",
  "anchor-name",
  "anchor-scope",
  "position-anchor",
  "position-area",
  "position-visibility",
]);
const deniedPropertyPattern =
  /^(-webkit-)?animation|^position-try|^view-transition/;

const fontFaceDescriptors = new Set([
  ...["font-family", "src", "font-style", "font-weight", "font-stretch"],
  ...["font-display", "unicode-range", "size-adjust", "ascent-override"],
  ...["descent-override", "line-gap-override", "font-feature-settings"],
  "font-variation-settings",
]);

const propertyPattern = /^-?[a-z][a-z0-9-]*$/;
const customPropertyPattern = /^--[A-Za-z0-9_-]+$/;

/**
 * Returns the declarations to write in place of a dictionary's declaration: none when it is unsafe, or the declaration followed by a version whose colors follow the app's theme.
 * Inside `@font-face`, only font descriptors are kept.
 */
export function sanitizeDeclaration(
  declaration: Declaration,
  owner: StylesheetOwner,
  isFontFace: boolean,
): string[] {
  const property = allowedProperty(declaration.property, isFontFace);
  const { value } = declaration;
  if (!property || !sanitizeValue(value, owner) || value.type === "Raw")
    return [];
  if (property === "position" && hasIdentifier(value, "fixed")) return [];
  if (property === "font-family" || property === "font")
    renameFontFamilies(value, owner.fontFamilies);
  const important = declaration.important ? " !important" : "";
  const adapted = adaptColorValue(property, value);
  return [generate(value), ...(adapted ? [adapted] : [])].map(
    (text) => `${property}: ${text}${important}`,
  );
}

/** Returns the property name to write, or null when the property is not allowed or its name hides behind escapes. */
function allowedProperty(name: string, isFontFace: boolean): string | null {
  if (customPropertyPattern.test(name) && !isFontFace)
    return customPropertyPrefix + name.slice(2);
  const property = name.toLowerCase();
  if (!propertyPattern.test(property)) return null;
  if (isFontFace) return fontFaceDescriptors.has(property) ? property : null;
  if (property === "src" || deniedProperties.has(property)) return null;
  return deniedPropertyPattern.test(property) ? null : property;
}

function hasIdentifier(value: Value, name: string): boolean {
  let found = false;
  walk(value, (node) => {
    if (node.type === "Identifier" && node.name.toLowerCase() === name)
      found = true;
  });
  return found;
}
