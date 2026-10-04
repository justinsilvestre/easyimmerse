import type { ImageElement } from "@easyimmerse/types";
import clsx from "clsx";
import { ImageIcon } from "lucide-react";
import { type CSSProperties, type ReactNode, useState } from "react";
import { useDefinitionContext } from "./definitionContext.ts";
import { dataAttributes } from "./sanitizeAttributes.ts";
import { sanitizeStyle } from "./sanitizeStyle.ts";

const verticalAlignments = new Set([
  "baseline",
  "sub",
  "super",
  "text-top",
  "text-bottom",
  "middle",
  "top",
  "bottom",
]);
const imageRenderings = new Set(["auto", "pixelated", "crisp-edges"]);

/**
 * Renders an image from a dictionary's structured content, found through the caller's `resolveMediaUrl`.
 * A `monochrome` image is painted in the current text color, and a collapsible or collapsed image sits behind a toggle.
 */
export function StructuredImage({ image }: { image: ImageElement }) {
  const { dictionaryId, resolveMediaUrl } = useDefinitionContext();
  const url = resolveMediaUrl(dictionaryId, image.path);
  const label = image.alt ?? image.title ?? image.description ?? "";
  if (!url)
    return label ? <span className="text-fg-faint">[{label}]</span> : null;
  const picture = <Picture image={image} url={url} label={label} />;
  if (!image.collapsible && !image.collapsed) return picture;
  return (
    <CollapsibleImage label={label} initiallyOpen={!image.collapsed}>
      {picture}
    </CollapsibleImage>
  );
}

function Picture({
  image,
  url,
  label,
}: {
  image: ImageElement;
  url: string;
  label: string;
}) {
  const attributes = {
    title: image.title ?? image.description,
    ...dataAttributes(image.data),
  };
  if (image.appearance === "monochrome")
    return (
      <span
        role="img"
        aria-label={label}
        className="inline-block bg-current"
        style={{ ...pictureStyle(image, "1em"), ...maskStyle(url) }}
        {...attributes}
      />
    );
  return (
    <img
      src={url}
      alt={label}
      className={clsx(
        "inline-block max-w-full object-contain",
        image.background !== false && "bg-surface-muted",
      )}
      style={pictureStyle(image)}
      {...attributes}
    />
  );
}

function pictureStyle(
  image: ImageElement,
  defaultSize?: string,
): CSSProperties {
  const unit = image.sizeUnits === "em" ? "em" : "px";
  return {
    width: length(image.width, unit) ?? defaultSize,
    height: length(image.height, unit) ?? defaultSize,
    verticalAlign: allowed(verticalAlignments, image.verticalAlign),
    imageRendering: allowed(
      imageRenderings,
      image.imageRendering,
    ) as CSSProperties["imageRendering"],
    ...sanitizeStyle({
      ...(image.border && { border: image.border }),
      ...(image.borderRadius && { borderRadius: image.borderRadius }),
    }),
  };
}

function length(size: number | undefined, unit: string): string | undefined {
  return size !== undefined && Number.isFinite(size) && size > 0
    ? `${size}${unit}`
    : undefined;
}

function allowed(values: ReadonlySet<string>, value: string | undefined) {
  return value && values.has(value) ? value : undefined;
}

function maskStyle(url: string): CSSProperties {
  const image = `url("${url.replace(/["\\\n\r]/g, encodeURIComponent)}")`;
  return {
    maskImage: image,
    WebkitMaskImage: image,
    maskSize: "contain",
    WebkitMaskSize: "contain",
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
    maskPosition: "center",
    WebkitMaskPosition: "center",
  };
}

function CollapsibleImage({
  label,
  initiallyOpen,
  children,
}: {
  label: string;
  initiallyOpen: boolean;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1 rounded text-xs text-fg-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
      >
        <ImageIcon className="size-3.5" aria-hidden />
        {isOpen ? "Hide image" : `Show image${label ? `: ${label}` : ""}`}
      </button>
      {isOpen && children}
    </span>
  );
}
