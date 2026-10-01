import type {
  StructuredContent as Content,
  StructuredContentElement,
} from "@easyimmerse/types";
import { DictionaryImage } from "./DictionaryImage.tsx";
import { StructuredContentLink } from "./StructuredContentLink.tsx";
import { toCssProperties } from "./toCssProperties.ts";
import { toDataAttributes } from "./toDataAttributes.ts";

type StructuredContentProps = {
  content: Content | undefined;
  /** The dictionary the content comes from, which serves its images. */
  dictionaryId: string;
};

/**
 * Renders Yomitan structured content, the HTML-like markup that dictionaries use for rich definitions, as the HTML elements it names.
 * Each element carries its `data` as `data-sc-*` attributes, which the dictionary's stylesheet selects on.
 */
export function StructuredContent({
  content,
  dictionaryId,
}: StructuredContentProps) {
  if (content === undefined || typeof content === "string") return content;
  if (Array.isArray(content))
    return content.map((node, index) => (
      <StructuredContent
        // biome-ignore lint/suspicious/noArrayIndexKey: Dictionary content never changes, so positions are stable keys.
        key={index}
        content={node}
        dictionaryId={dictionaryId}
      />
    ));
  return <ElementView element={content} dictionaryId={dictionaryId} />;
}

function ElementView({
  element,
  dictionaryId,
}: {
  element: StructuredContentElement;
  dictionaryId: string;
}) {
  const children = "content" in element && (
    <StructuredContent content={element.content} dictionaryId={dictionaryId} />
  );
  switch (element.tag) {
    case "br":
      return <br {...toDataAttributes(element.data)} />;
    case "img":
      return <DictionaryImage image={element} dictionaryId={dictionaryId} />;
    case "a":
      return (
        <StructuredContentLink link={element} dictionaryId={dictionaryId} />
      );
    case "table":
      return (
        <div className="pointer-events-auto max-w-full overflow-x-auto">
          <table
            lang={element.lang}
            className="table-auto border-collapse"
            {...toDataAttributes(element.data)}
          >
            {hasTableSections(element.content) ? (
              children
            ) : (
              <tbody>{children}</tbody>
            )}
          </table>
        </div>
      );
    case "ruby":
    case "rt":
    case "rp":
    case "thead":
    case "tbody":
    case "tfoot":
    case "tr": {
      const Tag = element.tag;
      return (
        <Tag
          lang={element.lang}
          className={containerClassNames[element.tag]}
          {...toDataAttributes(element.data)}
        >
          {children}
        </Tag>
      );
    }
    case "td":
    case "th": {
      const Tag = element.tag;
      return (
        <Tag
          lang={element.lang}
          colSpan={element.colSpan}
          rowSpan={element.rowSpan}
          style={toCssProperties(element.style)}
          className={cellClassNames[element.tag]}
          {...toDataAttributes(element.data)}
        >
          {children}
        </Tag>
      );
    }
    default: {
      const Tag = element.tag;
      return (
        <Tag
          lang={element.lang}
          title={element.title}
          open={element.tag === "details" ? element.open : undefined}
          style={toCssProperties(element.style)}
          className={styledClassNames[element.tag]}
          {...toDataAttributes(element.data)}
        >
          {children}
        </Tag>
      );
    }
  }
}

type Tag = StructuredContentElement["tag"];

/** Tells whether a table's content holds its own sections. A table without them gets a body, as the browser's HTML parser would add. */
function hasTableSections(content: Content | undefined): boolean {
  const nodes = Array.isArray(content) ? content : [content];
  return nodes.some(
    (node) =>
      typeof node === "object" &&
      !Array.isArray(node) &&
      (node.tag === "thead" || node.tag === "tbody" || node.tag === "tfoot"),
  );
}

// These class names restore the browser's default look for lists and tables, which the app's base styles reset.
const containerClassNames: Partial<Record<Tag, string>> = {
  thead: "bg-gray-100 font-bold",
  tfoot: "bg-gray-100 font-bold",
};

const cellClassNames: Partial<Record<Tag, string>> = {
  td: "border border-gray-300 p-[0.25em] align-top",
  th: "border border-gray-300 bg-gray-100 p-[0.25em] align-top font-bold",
};

const styledClassNames: Partial<Record<Tag, string>> = {
  ol: "list-decimal pl-[1.4em]",
  ul: "list-disc pl-[1.4em]",
  details: "pl-[0.7em]",
  summary: "pointer-events-auto cursor-pointer",
};
