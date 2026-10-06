import clsx from "clsx";
import { type ComponentProps, createElement, type ElementType } from "react";

/** The element and default classes for each kind of element that dictionary content may contain. */
const elements = {
  b: ["b", "font-bold"],
  strong: ["strong", "font-bold"],
  i: ["i", "italic"],
  em: ["em", "italic"],
  cite: ["cite", "italic"],
  u: ["u", "underline"],
  s: ["s", "line-through"],
  sub: ["sub", ""],
  sup: ["sup", ""],
  small: ["small", ""],
  big: ["span", "text-[1.2em]"],
  code: ["code", "font-mono text-[0.9em]"],
  mark: ["mark", "bg-warning-soft text-fg"],
  abbr: ["abbr", ""],
  q: ["q", ""],
  br: ["br", ""],
  hr: ["hr", "my-1.5 border-line"],
  p: ["p", "my-1"],
  h1: ["h1", "my-1 text-[1.25em] font-semibold"],
  h2: ["h2", "my-1 text-[1.15em] font-semibold"],
  h3: ["h3", "my-1 text-[1.05em] font-semibold"],
  h4: ["h4", "my-1 font-semibold"],
  h5: ["h5", "my-1 font-semibold"],
  h6: ["h6", "my-1 font-semibold"],
  div: ["div", ""],
  section: ["section", ""],
  article: ["article", ""],
  header: ["header", ""],
  footer: ["footer", ""],
  figure: ["figure", "my-1"],
  figcaption: ["figcaption", "text-fg-muted"],
  center: ["div", "text-center"],
  span: ["span", ""],
  blockquote: ["blockquote", "my-1 border-l-2 border-line pl-3"],
  pre: ["pre", "font-mono text-xs whitespace-pre-wrap"],
  ul: ["ul", "list-disc pl-5"],
  ol: ["ol", "list-decimal pl-6"],
  li: ["li", ""],
  dl: ["dl", ""],
  dt: ["dt", "font-semibold"],
  dd: ["dd", "pl-4"],
  table: ["table", "my-1 border-collapse text-left"],
  caption: ["caption", "text-fg-muted"],
  thead: ["thead", ""],
  tbody: ["tbody", ""],
  tfoot: ["tfoot", ""],
  tr: ["tr", ""],
  td: ["td", "border border-line px-1.5 py-0.5 align-top"],
  th: [
    "th",
    "border border-line bg-surface-muted px-1.5 py-0.5 align-top font-semibold",
  ],
  ruby: ["ruby", ""],
  rt: ["rt", "text-[0.6em]"],
  rp: ["rp", ""],
  details: ["details", ""],
  summary: ["summary", "cursor-pointer"],
  example: ["span", "italic text-fg-soft"],
  comment: ["span", "text-fg-muted"],
  grammar: ["span", "italic text-fg-muted"],
  etymology: ["span", "text-fg-muted"],
  transcription: ["span", "text-fg-muted"],
  optional: ["span", "text-fg-faint"],
  translation: ["span", "font-medium"],
  label: ["span", "rounded bg-surface-muted px-1 text-xs text-fg-muted"],
  sense: ["div", "pl-3"],
} satisfies Record<string, readonly [ElementType, string]>;

/** A kind of element in dictionary content: an HTML element, or a part of an entry such as an example or a grammatical label. */
export type RichKind = keyof typeof elements;

/** Renders one element of dictionary content with the app's default look for its kind, and the dictionary's own classes after it. */
export function RichElement({
  kind,
  className,
  ...attributes
}: { kind: RichKind } & ComponentProps<"td"> &
  Pick<ComponentProps<"details">, "open">) {
  const [tag, defaultClassName] = elements[kind];
  return createElement(tag, {
    className: clsx(defaultClassName, className) || undefined,
    ...attributes,
  });
}
