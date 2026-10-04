import { useDefinitionContext } from "./definitionContext.ts";
import type { MarkupImageSpec } from "./markupRule.ts";

/** Renders an image from dictionary markup when it is stored with the dictionary or embedded, and its alternative text otherwise. */
export function MarkupImage({ image }: { image: MarkupImageSpec }) {
  const { dictionaryId, resolveMediaUrl } = useDefinitionContext();
  const { source, alt, width, height } = image;
  const url =
    source?.kind === "embedded"
      ? source.url
      : source && resolveMediaUrl(dictionaryId, source.path);
  if (!url) return alt ? <span className="text-fg-faint">[{alt}]</span> : null;
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
