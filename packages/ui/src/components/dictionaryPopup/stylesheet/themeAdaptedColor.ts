/** Whether a dictionary color paints text and lines, which must stay light on dark surfaces, or a background, which must stay dark. */
export type ColorRole = "foreground" | "background";

/** Keywords that a color property accepts but that name no color to adapt. */
export const nonColorKeywords = new Set([
  "inherit",
  "initial",
  "unset",
  "revert",
  "revert-layer",
  "currentcolor",
  "transparent",
  "none",
  "auto",
]);

/** OKLCH lightness bounds that keep dictionary colors readable against the dark theme's surfaces and text. */
const darkLightness: Record<ColorRole, string> = {
  foreground: "max(l, 0.75)",
  background: "min(l, 0.35)",
};

/**
 * Returns a CSS color that is the dictionary's color in a light color scheme.
 * In a dark color scheme it keeps the color's hue and chroma, but raises the lightness of text colors and lowers that of backgrounds, so that dictionaries designed for white pages stay readable.
 * Browsers without `light-dark()` or relative colors reject the result, so callers keep the plain color as a fallback.
 */
export function themeAdaptedColor(color: string, role: ColorRole): string {
  return `light-dark(${color}, oklch(from ${color} ${darkLightness[role]} c h))`;
}

/** A color written as a hex code, a name, or one color function without nested functions. */
const plainColorPattern =
  /^(#[0-9a-f]{3,8}|[a-z]+|(rgba?|hsla?|hwb|lab|lch|oklab|oklch)\([^()]*\))$/i;

let supportsAdaptedColors: boolean | undefined;

/**
 * Adapts a color from an inline style, which has no room for a fallback, when the browser accepts the adapted form.
 * Returns other values, such as keywords, as they are.
 */
export function themeAdaptedInlineColor(
  value: string,
  role: ColorRole,
): string {
  const color = value.trim();
  if (
    !plainColorPattern.test(color) ||
    nonColorKeywords.has(color.toLowerCase())
  )
    return value;
  supportsAdaptedColors ??= acceptsColor(themeAdaptedColor("red", role));
  return supportsAdaptedColors ? themeAdaptedColor(color, role) : value;
}

/** Whether an inline style keeps the color, which is how it will be applied. */
function acceptsColor(color: string): boolean {
  if (typeof document === "undefined") return false;
  const { style } = document.createElement("span");
  style.color = color;
  return style.color !== "";
}
