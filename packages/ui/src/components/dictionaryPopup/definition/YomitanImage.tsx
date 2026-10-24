import type { ImageElement } from "@easyimmerse/types";
import clsx from "clsx";
import { type CSSProperties, useState } from "react";
import { imageLayout } from "./imageLayout.ts";
import { dataAttributes } from "./sanitizeAttributes.ts";
import { sanitizeStyle } from "./sanitizeStyle.ts";
import {
  structuredContentClassName,
  yomitanClassName,
} from "./yomitanClassName.ts";

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

type LoadState = "loading" | "loaded" | "load-error";

/**
 * Renders an image of structured content inside the elements Yomitan wraps it in, with Yomitan's classes and `data-*` attributes, so that stylesheets written for Yomitan apply.
 * The container keeps the image's aspect ratio as it shrinks to fit, and a `monochrome` image is painted in the current text color through a mask.
 *
 * The container's font size is the text's divided by Yomitan's `--font-size-no-units`, so that one em inside it is about one pixel.
 * Dictionaries write pixel lengths as `calc(<n>em / var(--font-size-no-units))`, and Jitendex sizes the image container's border that way relative to this smaller font.
 */
export function YomitanImage({
  image,
  url,
  label,
}: {
  image: ImageElement;
  url: string;
  label: string;
}) {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const { width, height, aspectRatio } = imageLayout(image);
  const hasAspectRatio = aspectRatio !== undefined;
  const isMonochrome = image.appearance === "monochrome";
  return (
    <span
      className={clsx(
        yomitanClassName("gloss-image-link"),
        "inline-block max-w-full",
      )}
      style={{
        verticalAlign: allowed(verticalAlignments, image.verticalAlign),
      }}
      {...yomitanDataAttributes(image, hasAspectRatio, loadState)}
    >
      <span
        className={clsx(
          yomitanClassName("gloss-image-container"),
          "relative block max-w-full overflow-hidden text-[length:calc(1em/var(--dict-font-size-no-units,14))]",
        )}
        title={image.title ?? image.description}
        style={{
          width: hasAspectRatio ? inContainer(width) : undefined,
          ...borderStyle(image),
        }}
      >
        <span
          className={clsx(yomitanClassName("gloss-image-sizer"), "block")}
          style={
            hasAspectRatio ? { paddingTop: `${aspectRatio * 100}%` } : undefined
          }
        />
        <span
          className={clsx(
            yomitanClassName("gloss-image-background"),
            "absolute inset-0",
            isMonochrome
              ? "bg-current"
              : image.background !== false && "bg-surface-muted",
          )}
          style={isMonochrome ? maskStyle(url) : undefined}
        />
        <span
          className={clsx(
            yomitanClassName("gloss-image-container-overlay"),
            "absolute inset-0",
          )}
        />
        <img
          src={url}
          alt={label}
          className={clsx(
            yomitanClassName("gloss-image"),
            structuredContentClassName("img"),
            hasAspectRatio
              ? "absolute inset-0 size-full"
              : "relative block max-w-full",
            "object-contain",
            isMonochrome && "opacity-0",
          )}
          style={{
            width: hasAspectRatio ? undefined : inContainer(width),
            height: hasAspectRatio ? undefined : inContainer(height),
            imageRendering: allowed(
              imageRenderings,
              image.imageRendering,
            ) as CSSProperties["imageRendering"],
          }}
          onLoad={() => setLoadState("loaded")}
          onError={() => setLoadState("load-error")}
        />
      </span>
    </span>
  );
}

/** The attributes through which Yomitan exposes an image's settings and loading state to stylesheets, followed by the dictionary's own `data-sc-*` attributes. */
function yomitanDataAttributes(
  image: ImageElement,
  hasAspectRatio: boolean,
  loadState: LoadState,
): Record<string, string> {
  return {
    "data-path": image.path,
    "data-image-load-state": loadState,
    "data-has-aspect-ratio": String(hasAspectRatio),
    "data-image-rendering":
      allowed(imageRenderings, image.imageRendering) ?? "auto",
    "data-appearance":
      image.appearance === "monochrome" ? "monochrome" : "auto",
    "data-background": String(image.background !== false),
    "data-collapsed": String(image.collapsed === true),
    "data-collapsible": String(image.collapsible === true),
    ...dataAttributes(image.data),
  };
}

/** Rewrites a length in the text's em so that it keeps its size inside the container, whose font is smaller. */
function inContainer(length: string | undefined): string | undefined {
  return length?.endsWith("em")
    ? `calc(${length} * var(--dict-font-size-no-units, 14))`
    : length;
}

function borderStyle(image: ImageElement): CSSProperties {
  return sanitizeStyle({
    ...(image.border && { border: image.border }),
    ...(image.borderRadius && { borderRadius: image.borderRadius }),
  });
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
