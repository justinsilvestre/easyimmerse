import { useDefinitionContext } from "./definitionContext.ts";
import type { MarkupImageSpec } from "./markupRule.ts";
import { PictureCanvas } from "./PictureCanvas.tsx";

/** Renders an image from dictionary markup when it is stored with the dictionary or embedded, and its alternative text otherwise. */
export function MarkupImage({ image }: { image: MarkupImageSpec }) {
  const { dictionaryId, resolveMedia } = useDefinitionContext();
  const { source, alt, width, height } = image;
  const url =
    source?.kind === "embedded"
      ? source.url
      : source && resolveMedia(dictionaryId, source.path);
  if (!url) return alt ? <span className="text-fg-faint">[{alt}]</span> : null;
  if (typeof url !== "string")
    return (
      <PictureCanvas
        picture={url}
        label={alt}
        style={{ width, height }}
        className="inline-block max-w-full object-contain align-middle"
      />
    );
  return (
    <img
      src={url}
      alt={alt}
      width={width}
      height={height}
      className="inline-block max-w-full object-contain align-middle"
    />
  );
}
