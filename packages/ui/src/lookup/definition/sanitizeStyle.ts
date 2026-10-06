import type { StyleValue } from "@easyimmerse/types";
import type { CSSProperties } from "react";
import {
  type ColorRole,
  themeAdaptedInlineColor,
} from "../stylesheet/themeAdaptedColor.ts";

/** Lengths whose unitless numbers mean multiples of the font size, as in Yomitan structured content. */
const emLengthProperties = new Set([
  "margin",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
]);

const allowedProperties = new Set([
  ...emLengthProperties,
  "fontStyle",
  "fontWeight",
  "fontSize",
  "color",
  "backgroundColor",
  "textDecoration",
  "textDecorationLine",
  "textDecorationStyle",
  "textDecorationColor",
  "textAlign",
  "verticalAlign",
  "border",
  "borderTop",
  "borderRight",
  "borderBottom",
  "borderLeft",
  "borderColor",
  "borderStyle",
  "borderWidth",
  "borderRadius",
  "listStyleType",
  "whiteSpace",
  "wordBreak",
]);

const colorRoles: Readonly<Record<string, ColorRole>> = {
  color: "foreground",
  backgroundColor: "background",
};

/** Values that could load a resource, which would reveal the reader to a remote server, or escape their own syntax. */
const forbiddenValuePattern = /url\(|image-set\(|expression\(|@|\\/i;

/**
 * Builds a React style from dictionary-supplied properties, keeping only typographic and box properties.
 * Drops any value that could load a resource or escape its syntax, and adapts colors to the app's dark theme.
 */
export function sanitizeStyle(
  style: Readonly<Record<string, StyleValue>>,
): CSSProperties {
  const sanitized: Record<string, string | number> = {};
  for (const [property, value] of Object.entries(style)) {
    const cssValue = toCssValue(property, value);
    if (
      allowedProperties.has(property) &&
      !forbiddenValuePattern.test(String(cssValue))
    )
      sanitized[property] = adaptColor(property, cssValue);
  }
  return sanitized;
}

function adaptColor(property: string, value: string | number) {
  const role = colorRoles[property];
  return role && typeof value === "string"
    ? themeAdaptedInlineColor(value, role)
    : value;
}

function toCssValue(property: string, value: StyleValue): string | number {
  if (Array.isArray(value)) return value.join(" ");
  if (typeof value === "number" && emLengthProperties.has(property))
    return `${value}em`;
  return value;
}

/** Reads an inline `style` attribute into camel-cased properties, to be passed through `sanitizeStyle`. */
export function parseStyleAttribute(style: string): Record<string, string> {
  const properties: Record<string, string> = {};
  for (const declaration of style.split(";")) {
    const colon = declaration.indexOf(":");
    if (colon < 0) continue;
    const name = declaration.slice(0, colon).trim().toLowerCase();
    const value = declaration.slice(colon + 1).trim();
    if (value) properties[toCamelCase(name)] = value;
  }
  return properties;
}

function toCamelCase(name: string): string {
  return name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}
