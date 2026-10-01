import { buildDictionaryAssetUrl } from "@easyimmerse/backend";
import type { GlossaryImage, ImageElement } from "@easyimmerse/types";
import clsx from "clsx";
import type { CSSProperties } from "react";

/** An image from a glossary item, or from an `img` element of structured content, which adds layout hints. */
export type DictionaryImageSource = GlossaryImage &
  Partial<
    Pick<
      ImageElement,
      "data" | "sizeUnits" | "verticalAlign" | "border" | "borderRadius"
    >
  >;

/**
 * Shows an image from a dictionary archive with the display hints Yomitan honors.
 * A collapsed image stays hidden until the person opens it.
 */
export function DictionaryImage({
  image,
  dictionaryId,
}: {
  image: DictionaryImageSource;
  dictionaryId: string;
}) {
  const url = buildDictionaryAssetUrl(dictionaryId, image.path);
  if (url === null)
    return <span className="text-gray-500">[{image.alt || "Image"}]</span>;
  const picture = <ImagePicture image={image} url={url} />;
  if (!image.collapsed) return picture;
  return (
    <details className="relative z-20 inline-block align-top">
      <summary className="cursor-pointer text-blue-700">Image</summary>
      {picture}
    </details>
  );
}

function ImagePicture({
  image,
  url,
}: {
  image: DictionaryImageSource;
  url: string;
}) {
  const style = measureImage(image);
  if (image.appearance === "monochrome")
    return (
      <span
        role="img"
        aria-label={image.alt}
        title={image.title}
        className="inline-block bg-current mask-contain mask-center mask-no-repeat"
        style={{
          width: "1em",
          height: "1em",
          ...style,
          maskImage: `url(${JSON.stringify(url)})`,
        }}
      />
    );
  return (
    <img
      src={url}
      alt={image.alt ?? ""}
      title={image.title}
      className={clsx(
        "inline-block max-w-full object-contain",
        image.background !== false && "bg-gray-100",
      )}
      style={style}
    />
  );
}

/** Sizes the image in its units, which are pixels unless it says `em`, and applies its other layout hints. */
function measureImage(image: DictionaryImageSource): CSSProperties {
  const units = image.sizeUnits === "em" ? "em" : "px";
  return {
    width: image.width === undefined ? undefined : `${image.width}${units}`,
    height: image.height === undefined ? undefined : `${image.height}${units}`,
    verticalAlign: image.verticalAlign,
    border: image.border,
    borderRadius: image.borderRadius,
    imageRendering:
      image.imageRendering ?? (image.pixelated ? "pixelated" : undefined),
  };
}
