import { classifyHref } from "./classifyHref.ts";
import {
  type ElementAttributes,
  imageRule,
  type MarkupRule,
  unwrap,
} from "./markupRule.ts";
import type { RichKind } from "./RichElement.tsx";
import { languageTag, tableSpan } from "./sanitizeAttributes.ts";
import { parseStyleAttribute, sanitizeStyle } from "./sanitizeStyle.ts";

const kindsByTag: Readonly<Record<string, RichKind>> = {
  b: "b",
  strong: "b",
  i: "i",
  em: "i",
  cite: "i",
  var: "i",
  dfn: "i",
  u: "u",
  ins: "u",
  s: "s",
  strike: "s",
  del: "s",
  sub: "sub",
  sup: "sup",
  small: "small",
  big: "big",
  tt: "code",
  code: "code",
  kbd: "code",
  samp: "code",
  mark: "mark",
  br: "br",
  hr: "hr",
  p: "p",
  h1: "heading",
  h2: "heading",
  h3: "heading",
  h4: "heading",
  h5: "heading",
  h6: "heading",
  div: "div",
  section: "div",
  article: "div",
  header: "div",
  footer: "div",
  aside: "div",
  main: "div",
  nav: "div",
  figure: "div",
  figcaption: "div",
  center: "center",
  span: "span",
  font: "span",
  abbr: "span",
  rb: "span",
  blockquote: "blockquote",
  pre: "pre",
  ul: "ul",
  ol: "ol",
  li: "li",
  dl: "dl",
  dt: "dt",
  dd: "dd",
  table: "table",
  caption: "caption",
  thead: "thead",
  tbody: "tbody",
  tfoot: "tfoot",
  tr: "tr",
  td: "td",
  th: "th",
  ruby: "ruby",
  rt: "rt",
  rp: "rp",
  details: "details",
  summary: "summary",
};

/** Decides how to render an element of HTML from a StarDict or MDict dictionary. Unknown elements give way to their content. */
export function htmlRule(element: Element, tag: string): MarkupRule {
  switch (tag) {
    case "a":
      return element.hasAttribute("href")
        ? {
            action: "link",
            target: classifyHref(element.getAttribute("href") ?? ""),
          }
        : unwrap;
    case "img":
      return imageRule(element.getAttribute("src"), element);
    case "audio":
      return { action: "sound" };
  }
  const kind = kindsByTag[tag];
  return kind
    ? { action: "element", kind, attributes: htmlAttributes(element) }
    : unwrap;
}

function htmlAttributes(element: Element): ElementAttributes {
  const style = {
    ...presentationalStyle(element),
    ...parseStyleAttribute(element.getAttribute("style") ?? ""),
  };
  return {
    style: sanitizeStyle(style),
    title: element.getAttribute("title") ?? undefined,
    lang: languageTag(element.getAttribute("lang")),
    colSpan: tableSpan(numberAttribute(element, "colspan")),
    rowSpan: tableSpan(numberAttribute(element, "rowspan")),
    open: element.hasAttribute("open") || undefined,
  };
}

/** Reads the old presentational attributes that dictionaries still use, `<font color>` and `align`, as styles. */
function presentationalStyle(element: Element): Record<string, string> {
  const color = element.getAttribute("color");
  const align = element.getAttribute("align");
  return { ...(color && { color }), ...(align && { textAlign: align }) };
}

function numberAttribute(element: Element, name: string): number | undefined {
  const value = element.getAttribute(name);
  return value === null ? undefined : Number(value);
}
