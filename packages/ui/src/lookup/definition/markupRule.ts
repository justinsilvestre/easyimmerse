import type { MarkupDialect } from "@easyimmerse/types";
import type { CSSProperties } from "react";
import type { LinkTarget } from "./classifyHref.ts";
import { type ImageSource, imageSource } from "./imageSource.ts";
import type { RichKind } from "./RichElement.tsx";

/** The markup languages that dictionary definitions are written in. */
export type MarkupLanguage = "html" | MarkupDialect;

/** The attributes kept on an element of dictionary markup, all of them already checked. */
export type ElementAttributes = {
  /** The dictionary's class names, prefixed so that they cannot match the app's own classes. */
  className?: string;
  style?: CSSProperties;
  title?: string;
  lang?: string;
  colSpan?: number;
  rowSpan?: number;
  open?: boolean;
};

/** What to render for one element of dictionary markup. */
export type MarkupRule =
  | { action: "drop" }
  | { action: "unwrap" }
  | { action: "element"; kind: RichKind; attributes?: ElementAttributes }
  | { action: "link"; target: LinkTarget }
  | { action: "sound" }
  | { action: "image"; image: MarkupImageSpec };

/** An image in dictionary markup, with the size its markup asks for. */
export type MarkupImageSpec = {
  source: ImageSource | null;
  alt: string;
  width?: number;
  height?: number;
};

/** Elements dropped with all their content, in every markup language, because their content is code, metadata or form controls rather than text. */
export const droppedTags = new Set([
  "script",
  "style",
  "iframe",
  "frame",
  "frameset",
  "object",
  "embed",
  "applet",
  "template",
  "noscript",
  "head",
  "title",
  "link",
  "meta",
  "base",
  "svg",
  "math",
  "canvas",
  "video",
  "source",
  "track",
  "map",
  "input",
  "textarea",
  "select",
  "button",
]);

export const drop: MarkupRule = { action: "drop" };
export const unwrap: MarkupRule = { action: "unwrap" };

export function imageRule(src: string | null, element: Element): MarkupRule {
  return {
    action: "image",
    image: {
      source: src ? imageSource(src) : null,
      alt: element.getAttribute("alt") ?? "",
      width: pixelAttribute(element, "width"),
      height: pixelAttribute(element, "height"),
    },
  };
}

function pixelAttribute(element: Element, name: string): number | undefined {
  const value = Number.parseInt(element.getAttribute(name) ?? "", 10);
  return value > 0 && value <= 4096 ? value : undefined;
}
