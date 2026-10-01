import type {
  Glossary,
  StructuredContent,
  StructuredContentElement,
} from "@easyimmerse/types";

type Tag = StructuredContentElement["tag"];

const blockTags: ReadonlySet<Tag> = new Set([
  "div",
  "ol",
  "ul",
  "li",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "details",
  "summary",
]);

/**
 * Tags whose content plain text leaves out.
 * A ruby reading cannot sit above its characters in plain text, and inline it would split the words it annotates.
 */
const omittedTags: ReadonlySet<Tag> = new Set(["rt", "rp", "img"]);

/**
 * Turns one definition into plain text, such as for a flashcard field.
 * Block elements and list items of structured content go on lines of their own.
 * Ruby readings and images are left out.
 */
export function formatGlossaryAsText(glossary: Glossary): string {
  if (typeof glossary === "string") return glossary;
  if (Array.isArray(glossary)) {
    const [term, inflections] = glossary;
    const named = inflections.length > 0 ? ` (${inflections.join(", ")})` : "";
    return `Inflected form of ${term}${named}`;
  }
  switch (glossary.type) {
    case "text":
      return glossary.text;
    case "image":
      return glossary.description ?? "";
    case "structured-content":
      return tidyLines(formatContent(glossary.content));
  }
}

function formatContent(content: StructuredContent | undefined): string {
  if (content === undefined || typeof content === "string")
    return content ?? "";
  if (Array.isArray(content)) return content.map(formatContent).join("");
  if (content.tag === "br") return "\n";
  if (omittedTags.has(content.tag) || !("content" in content)) return "";
  const text = formatContent(content.content);
  if (blockTags.has(content.tag)) return `\n${text}\n`;
  if (content.tag === "td" || content.tag === "th") return ` ${text} `;
  return text;
}

/** Collapses runs of spaces, trims each line, and drops empty lines. */
function tidyLines(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line !== "")
    .join("\n");
}
