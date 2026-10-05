import type {
  ContainerElement,
  StructuredContent,
  StructuredElement,
} from "@easyimmerse/types";
import clsx from "clsx";
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
import {
  structuredContentClassName,
  yomitanClassName,
} from "./yomitanClassName.ts";

/**
 * Renders Yomitan structured content as React elements, keeping only safe styles, attributes and links.
 * Elements carry the classes that Yomitan gives them, such as `gloss-sc-<tag>`, and tables, links and images sit in the wrappers Yomitan puts around them, so that stylesheets written for Yomitan apply.
 */
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
      return (
        <br
          className={structuredContentClassName("br")}
          {...dataAttributes(element.data)}
        />
      );
    case "img":
      return <StructuredImage image={element} />;
    case "a":
      return (
        <span lang={languageTag(element.lang)}>
          <ContentLink
            target={classifyHref(element.href)}
            className={clsx(
              yomitanClassName("gloss-link"),
              structuredContentClassName("a"),
            )}
          >
            <span className={yomitanClassName("gloss-link-text")}>
              <StructuredContentView content={element.content} />
            </span>
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
    case "table":
      return (
        <div
          className={clsx(
            yomitanClassName("gloss-sc-table-container"),
            "max-w-full overflow-x-auto",
          )}
        >
          <RichElement kind="table" {...containerAttributes(element)}>
            <StructuredContentView content={element.content} />
          </RichElement>
        </div>
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

function containerAttributes(
  element: ContainerElement & Pick<StructuredElement, "tag">,
) {
  return {
    className: structuredContentClassName(element.tag),
    lang: languageTag(element.lang),
    title: element.title,
    style: element.style && sanitizeStyle(element.style),
    ...dataAttributes(element.data),
  };
}
