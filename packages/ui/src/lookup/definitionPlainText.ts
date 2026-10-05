import type { Definition, StructuredContent } from "@easyimmerse/types";
import { parseMarkup } from "./definition/parseMarkup.ts";

/** Elements of structured content whose text is left out of plain text: furigana and its fallback parentheses. */
const omittedTags = new Set(["rt", "rp", "img"]);

/** Elements of structured content that start a new line in plain text. */
const lineTags = new Set(["br", "div", "li", "tr", "details"]);

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
  if (omittedTags.has(content.tag)) return "";
  if (content.tag === "br") return "\n";
  const text = "content" in content ? structuredText(content.content) : "";
  return lineTags.has(content.tag) ? `\n${text}\n` : text;
}

function markupText(markup: string, syntax: "html" | "xml"): string {
  return parseMarkup(markup, syntax)
    .map((node) => node.textContent ?? "")
    .join("");
}

function tidyLines(text: string): string {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .join("\n");
}
