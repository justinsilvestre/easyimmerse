import type {
  ContainerElement,
  StructuredContent,
  StructuredElement,
} from "@easyimmerse/types";
import { ContentLink } from "./ContentLink.tsx";
import { ContentText, PlainTextScope } from "./ContentText.tsx";
import { classifyHref } from "./classifyHref.ts";
import { RichElement } from "./RichElement.tsx";
import { StructuredImage } from "./StructuredImage.tsx";
import {
  dataAttributes,
  languageTag,
  tableSpan,
} from "./sanitizeAttributes.ts";
import { sanitizeStyle } from "./sanitizeStyle.ts";

/** Renders Yomitan structured content as React elements, keeping only safe styles, attributes and links. */
export function StructuredContentView({
  content,
}: {
  content: StructuredContent | undefined;
}) {
  if (content === undefined) return null;
  if (typeof content === "string") return <ContentText text={content} />;
  if (Array.isArray(content))
    return content.map((child, index) => (
      // Siblings in structured content have no identity of their own and never reorder.
      // biome-ignore lint/suspicious/noArrayIndexKey: see above
      <StructuredContentView key={index} content={child} />
    ));
  return <StructuredElementView element={content} />;
}

function StructuredElementView({ element }: { element: StructuredElement }) {
  switch (element.tag) {
    case "br":
      return <br {...dataAttributes(element.data)} />;
    case "img":
      return <StructuredImage image={element} />;
    case "a":
      return (
        <span lang={languageTag(element.lang)}>
          <ContentLink target={classifyHref(element.href)}>
            <StructuredContentView content={element.content} />
          </ContentLink>
        </span>
      );
    case "rt":
    case "rp":
      return (
        <RichElement kind={element.tag} {...containerAttributes(element)}>
          <PlainTextScope>
            <StructuredContentView content={element.content} />
          </PlainTextScope>
        </RichElement>
      );
    case "td":
    case "th":
      return (
        <RichElement
          kind={element.tag}
          colSpan={tableSpan(element.colSpan)}
          rowSpan={tableSpan(element.rowSpan)}
          {...containerAttributes(element)}
        >
          <StructuredContentView content={element.content} />
        </RichElement>
      );
    case "details":
      return (
        <RichElement
          kind="details"
          open={element.open}
          {...containerAttributes(element)}
        >
          <StructuredContentView content={element.content} />
        </RichElement>
      );
    default:
      return (
        <RichElement kind={element.tag} {...containerAttributes(element)}>
          <StructuredContentView content={element.content} />
        </RichElement>
      );
  }
}

function containerAttributes(element: ContainerElement) {
  return {
    lang: languageTag(element.lang),
    title: element.title,
    style: element.style && sanitizeStyle(element.style),
    ...dataAttributes(element.data),
  };
}
