import { type MarkupRule, unwrap } from "./markupRule.ts";
import type { RichKind } from "./RichElement.tsx";
import { sanitizeStyle } from "./sanitizeStyle.ts";

const kindsByTag: Readonly<Record<string, RichKind>> = {
  b: "b",
  i: "i",
  u: "u",
  s: "s",
  big: "big",
  small: "small",
  sub: "sub",
  sup: "sup",
  tt: "code",
};

const weights: Readonly<Record<string, string>> = {
  thin: "100",
  ultralight: "200",
  light: "300",
  book: "400",
  normal: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  ultrabold: "800",
  heavy: "900",
};

/** Points are given in Pango sizes as multiples of 1/1024. */
const pangoUnitsPerPoint = 1024;

/** Decides how to render an element of Pango markup, the GTK markup some StarDict dictionaries use. */
export function pangoRule(element: Element, tag: string): MarkupRule {
  if (tag === "span")
    return {
      action: "element",
      kind: "span",
      attributes: { style: sanitizeStyle(spanStyle(element)) },
    };
  const kind = kindsByTag[tag];
  return kind ? { action: "element", kind } : unwrap;
}

function spanStyle(element: Element): Record<string, string> {
  const read = (...names: string[]) =>
    names
      .map((name) => element.getAttribute(name))
      .find((value) => value !== null) ?? undefined;
  const weight = read("weight", "font_weight");
  return definedValues({
    color: read("foreground", "fgcolor", "color"),
    backgroundColor: read("background", "bgcolor"),
    fontWeight: weight && (weights[weight] ?? weight),
    fontStyle: read("style", "font_style"),
    fontSize: fontSize(read("size", "font_size")),
    textDecorationLine: decorationLines(
      read("underline"),
      read("strikethrough"),
    ),
  });
}

function fontSize(size: string | undefined): string | undefined {
  return size && /^\d+$/.test(size)
    ? `${Number(size) / pangoUnitsPerPoint}pt`
    : size;
}

function decorationLines(
  underline: string | undefined,
  strikethrough: string | undefined,
): string | undefined {
  const lines = [
    underline && underline !== "none" ? "underline" : "",
    strikethrough === "true" ? "line-through" : "",
  ].filter(Boolean);
  return lines.length > 0 ? lines.join(" ") : undefined;
}

function definedValues(
  style: Record<string, string | undefined>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(style).filter(
      (entry): entry is [string, string] => !!entry[1],
    ),
  );
}
