import type { Definition, StructuredContent } from "@easyimmerse/types";
import { parseMarkup } from "./definition/parseMarkup.ts";

/** Elements whose text is left out of plain text: furigana with its fallback parentheses, and anything not meant to be read. */
const omittedTags = new Set([
  "rt",
  "rp",
  "img",
  "style",
  "script",
  "template",
  "head",
  "title",
]);

/** Elements that stand on lines of their own in plain text. */
const lineTags = new Set([
  "div",
  "p",
  "li",
  "tr",
  "details",
  "summary",
  "dd",
  "dt",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "pre",
  "table",
  "ul",
  "ol",
]);

/** Writes a definition as plain text, for a flashcard field. */
export function definitionPlainText(definition: Definition): string {
  switch (definition.kind) {
    case "text":
      return definition.text.trim();
    case "structured":
      return tidyLines(structuredText(definition.content));
    case "html":
      return tidyLines(markupText(definition.html, "html"));
    case "markup":
      return tidyLines(markupText(definition.markup, "xml"));
    case "formOf":
      return `form of ${definition.base}`;
  }
}

function structuredText(content: StructuredContent | undefined): string {
  if (content === undefined) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map(structuredText).join("");
  const text = "content" in content ? structuredText(content.content) : "";
  return elementText(content.tag, text);
}

function markupText(markup: string, syntax: "html" | "xml"): string {
  return parseMarkup(markup, syntax).map(nodeText).join("");
}

function nodeText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const text = [...node.childNodes].map(nodeText).join("");
  return elementText((node as Element).localName.toLowerCase(), text);
}

/** Places an element's text in plain text by its tag: left out, on lines of its own, or inline. */
function elementText(tag: string, text: string): string {
  if (omittedTags.has(tag)) return "";
  if (tag === "br") return "\n";
  return lineTags.has(tag) ? `\n${text}\n` : text;
}

function tidyLines(text: string): string {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .join("\n");
}
