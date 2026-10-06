import { useMemo } from "react";
import { dictionaryElementId } from "../stylesheet/dictionaryScope.ts";
import { ContentLink, SoundControl } from "./ContentLink.tsx";
import { ContentText } from "./ContentText.tsx";
import { useDefinitionContext } from "./definitionContext.ts";
import { htmlRule } from "./htmlRule.ts";
import { MarkupImage } from "./MarkupImage.tsx";
import {
  drop,
  droppedTags,
  type MarkupLanguage,
  type MarkupRule,
} from "./markupRule.ts";
import { pangoRule } from "./pangoRule.ts";
import { parseMarkup } from "./parseMarkup.ts";
import { RichElement, type RichKind } from "./RichElement.tsx";
import { xdxfRule } from "./xdxfRule.ts";

const rules = { html: htmlRule, pango: pangoRule, xdxf: xdxfRule };

/** Kinds that start a new line, so that a line break in the text beside them would add an empty line. */
const blockKinds = new Set<RichKind>([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "div",
  "section",
  "article",
  "header",
  "footer",
  "figure",
  "figcaption",
  "center",
  "blockquote",
  "pre",
  "ul",
  "ol",
  "dl",
  "table",
  "hr",
  "details",
  "sense",
]);

/** Elements whose whitespace-only text children are layout, not content, and are invalid in the DOM. */
const whitespaceFreeKinds = new Set<RichKind>([
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "ul",
  "ol",
  "dl",
]);

/**
 * Renders HTML, Pango or XDXF markup from a dictionary as React elements.
 * Only allowlisted elements and attributes are kept; unknown elements give way to their text, and scripts, styles and embedded documents are dropped.
 */
export function MarkupView({
  markup,
  language,
}: {
  markup: string;
  language: MarkupLanguage;
}) {
  const nodes = useMemo(
    () => parseMarkup(markup, language === "html" ? "html" : "xml"),
    [markup, language],
  );
  // Pango and XDXF treat line breaks in the text as significant; HTML does not.
  return (
    <MarkupNodes
      nodes={nodes}
      language={language}
      preservesWhitespace={language !== "html"}
    />
  );
}

function MarkupNodes({
  nodes,
  language,
  preservesWhitespace,
}: {
  nodes: readonly Node[];
  language: MarkupLanguage;
  preservesWhitespace: boolean;
}) {
  return nodes.map((node, index) => (
    <MarkupNode
      // Parsed nodes have no identity of their own, and the markup of a definition never changes.
      // biome-ignore lint/suspicious/noArrayIndexKey: see above
      key={index}
      node={node}
      language={language}
      preservesWhitespace={preservesWhitespace}
    />
  ));
}

function MarkupNode({
  node,
  language,
  preservesWhitespace,
}: {
  node: Node;
  language: MarkupLanguage;
  preservesWhitespace: boolean;
}) {
  const { dictionaryId } = useDefinitionContext();
  if (
    node.nodeType === Node.TEXT_NODE ||
    node.nodeType === Node.CDATA_SECTION_NODE
  ) {
    if (isSpacingBesideBlock(node, language)) return null;
    const text = node.textContent ?? "";
    return (
      <ContentText
        text={preservesWhitespace ? text : collapseWhitespace(text)}
      />
    );
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return null;
  const element = node as Element;
  const rule = ruleFor(element, language);
  const children = (
    <MarkupNodes
      nodes={childNodes(element, rule)}
      language={language}
      preservesWhitespace={
        preservesWhitespace ||
        (rule.action === "element" && rule.kind === "pre")
      }
    />
  );
  switch (rule.action) {
    case "drop":
      return null;
    case "unwrap":
      return children;
    case "element": {
      if (rule.kind === "br" || rule.kind === "hr")
        return <RichElement kind={rule.kind} />;
      const { markupId, ...attributes } = rule.attributes ?? {};
      return (
        <RichElement
          kind={rule.kind}
          id={dictionaryElementId(dictionaryId, markupId)}
          {...attributes}
        >
          {children}
        </RichElement>
      );
    }
    case "link":
      return <ContentLink target={rule.target}>{children}</ContentLink>;
    case "sound":
      return <SoundControl />;
    case "image":
      return <MarkupImage image={rule.image} />;
  }
}

function ruleFor(element: Element, language: MarkupLanguage): MarkupRule {
  const tag = element.localName.toLowerCase();
  return droppedTags.has(tag) ? drop : rules[language](element, tag);
}

/** Whether a node is only whitespace beside an element that is dropped or starts its own line, where it would show as an empty line. */
function isSpacingBesideBlock(node: Node, language: MarkupLanguage): boolean {
  if (node.textContent?.trim()) return false;
  return [node.previousSibling, node.nextSibling].some((sibling) => {
    if (sibling?.nodeType !== Node.ELEMENT_NODE) return false;
    const rule = ruleFor(sibling as Element, language);
    return (
      rule.action === "drop" ||
      (rule.action === "element" && blockKinds.has(rule.kind))
    );
  });
}

function childNodes(element: Element, rule: MarkupRule): Node[] {
  const nodes = [...element.childNodes];
  if (rule.action !== "element" || !whitespaceFreeKinds.has(rule.kind))
    return nodes;
  return nodes.filter(
    (node) => node.nodeType !== Node.TEXT_NODE || node.textContent?.trim(),
  );
}

function collapseWhitespace(text: string): string {
  return text.replace(/[ \t\n\r\f]+/g, " ");
}
