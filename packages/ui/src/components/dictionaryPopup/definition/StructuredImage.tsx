import type { ImageElement } from "@easyimmerse/types";
import { ImageIcon } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useDefinitionContext } from "./definitionContext.ts";
import { YomitanImage } from "./YomitanImage.tsx";

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
  const picture = <YomitanImage image={image} url={url} label={label} />;
  if (!image.collapsible && !image.collapsed) return picture;
  return (
    <CollapsibleImage label={label} initiallyOpen={!image.collapsed}>
      {picture}
    </CollapsibleImage>
  );
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
