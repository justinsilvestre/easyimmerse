import type { Definition } from "@easyimmerse/types";
import { markupContentNodes } from "./markdown/markupContentNodes.ts";
import { structuredContentNodes } from "./markdown/structuredContentNodes.ts";
import { writeMarkdown } from "./markdown/writeMarkdown.ts";

/**
 * Writes a definition as CommonMark, for a flashcard field, following the form in which the app renders it:
 * lists become Markdown lists, headings and emphasis keep their marks, furigana and images are left out,
 * and a link keeps only its text unless it leads to an external page.
 * Markdown punctuation inside the dictionary's own text is not escaped.
 */
export function definitionMarkdown(definition: Definition): string {
  switch (definition.kind) {
    case "text":
      return definition.text.trim();
    case "structured":
      return writeMarkdown(structuredContentNodes(definition.content));
    case "html":
      return writeMarkdown(markupContentNodes(definition.html, "html"));
    case "markup":
      return writeMarkdown(
        markupContentNodes(definition.markup, definition.dialect),
      );
    case "formOf":
      return `form of ${definition.base}`;
  }
}
