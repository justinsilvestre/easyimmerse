import { classifyHref } from "./classifyHref.ts";
import { drop, imageRule, type MarkupRule, unwrap } from "./markupRule.ts";
import type { RichKind } from "./RichElement.tsx";
import { sanitizeStyle } from "./sanitizeStyle.ts";

const kindsByTag: Readonly<Record<string, RichKind>> = {
  b: "b",
  i: "i",
  u: "u",
  sub: "sub",
  sup: "sup",
  tt: "code",
  big: "big",
  small: "small",
  br: "br",
  blockquote: "blockquote",
  opt: "optional",
  nu: "optional",
  tr: "transcription",
  abr: "label",
  abbr: "label",
  dtrn: "translation",
  ex: "example",
  co: "comment",
  gr: "grammar",
  etm: "etymology",
  def: "sense",
};

const imageExtensions = /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i;
const soundExtensions = /\.(wav|mp3|ogg|oga|opus|spx|m4a|flac)$/i;

/** Decides how to render an element of XDXF, the dictionary markup some StarDict dictionaries use. */
export function xdxfRule(element: Element, tag: string): MarkupRule {
  switch (tag) {
    // The headword repeats what the result card already shows above the definition.
    case "k":
      return drop;
    case "kref":
      return lookupRule(element.getAttribute("k") ?? element.textContent ?? "");
    case "iref":
      return {
        action: "link",
        target: classifyHref(element.getAttribute("href") ?? ""),
      };
    case "rref":
      return resourceRule(element);
    case "c":
      return colorRule(element.getAttribute("c"));
  }
  const kind = kindsByTag[tag];
  return kind ? { action: "element", kind } : unwrap;
}

function lookupRule(term: string): MarkupRule {
  return term.trim()
    ? { action: "link", target: { kind: "lookup", term: term.trim() } }
    : unwrap;
}

function resourceRule(element: Element): MarkupRule {
  const path = element.textContent?.trim() ?? "";
  const type = element.getAttribute("type");
  if (type === "image" || (!type && imageExtensions.test(path)))
    return imageRule(path, element);
  if (type === "sound" || (!type && soundExtensions.test(path)))
    return { action: "sound" };
  return unwrap;
}

function colorRule(color: string | null): MarkupRule {
  return {
    action: "element",
    kind: "span",
    attributes: { style: color ? sanitizeStyle({ color }) : undefined },
  };
}
