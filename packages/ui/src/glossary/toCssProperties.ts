import type {
  CssLength,
  StructuredContentStyle,
  TextDecorationLine,
} from "@easyimmerse/types";
import type { CSSProperties } from "react";

/** Matches a CSS value that may load a resource, or that hides a function name behind an escape. */
const resourceLoadingValue =
  /\\|(?:url|src|image|image-set|cross-fade|element)\s*\(/i;

/**
 * Turns a structured-content style into inline styles.
 * A numeric margin is in `em`, as Yomitan reads it.
 * Values that could load a remote resource are dropped.
 */
export function toCssProperties(
  style: StructuredContentStyle | undefined,
): CSSProperties | undefined {
  if (style === undefined) return undefined;
  const {
    textDecorationLine,
    marginTop,
    marginLeft,
    marginRight,
    marginBottom,
    ...plainProperties
  } = style;
  return {
    ...dropResourceLoadingValues(plainProperties),
    textDecorationLine: joinLines(textDecorationLine),
    marginTop: toLength(marginTop),
    marginLeft: toLength(marginLeft),
    marginRight: toLength(marginRight),
    marginBottom: toLength(marginBottom),
  };
}

function dropResourceLoadingValues(
  properties: Record<string, string>,
): CSSProperties {
  return Object.fromEntries(
    Object.entries(properties).filter(
      ([, value]) => !resourceLoadingValue.test(value),
    ),
  );
}

function joinLines(line: TextDecorationLine | undefined): string | undefined {
  return Array.isArray(line) ? line.join(" ") : line;
}

function toLength(length: CssLength | undefined): string | undefined {
  return typeof length === "number" ? `${length}em` : length;
}
