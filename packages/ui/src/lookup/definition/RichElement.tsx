import { type ComponentProps, createElement, type ElementType } from "react";

/** The element and default classes for each kind of element that dictionary content may contain. */
const elements = {
  b: ["b", "font-bold"],
  i: ["i", "italic"],
  u: ["u", "underline"],
  s: ["s", "line-through"],
  sub: ["sub", ""],
  sup: ["sup", ""],
  small: ["small", ""],
  big: ["span", "text-[1.2em]"],
  code: ["code", "font-mono text-[0.9em]"],
  mark: ["mark", "bg-warning-soft text-fg"],
  br: ["br", ""],
  hr: ["hr", "my-1.5 border-line"],
  p: ["p", "my-1"],
  heading: ["p", "my-1 font-semibold"],
  div: ["div", ""],
  center: ["div", "text-center"],
  span: ["span", ""],
  blockquote: ["blockquote", "my-1 border-l-2 border-line pl-3"],
  pre: ["pre", "font-mono text-xs whitespace-pre-wrap"],
  ul: ["ul", "list-disc pl-5"],
  ol: ["ol", "list-decimal pl-5"],
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

/** Renders one element of dictionary content with the app's default look for its kind. */
export function RichElement({
  kind,
  ...attributes
}: { kind: RichKind } & ComponentProps<"td"> &
  Pick<ComponentProps<"details">, "open">) {
  const [tag, className] = elements[kind];
  return createElement(tag, {
    className: className || undefined,
    ...attributes,
  });
}
