import { ContentLink } from "./ContentLink.tsx";

/** Renders a definition that only points to the dictionary form of an inflected word, with that form clickable. */
export function FormOfView({
  base,
  inflections,
}: {
  base: string;
  inflections: readonly string[];
}) {
  return (
    <span>
      <span className="text-fg-muted">inflected form of </span>
      <ContentLink target={{ kind: "lookup", term: base }}>{base}</ContentLink>
      {inflections.length > 0 && (
        <span className="text-fg-muted"> ({inflections.join(", ")})</span>
      )}
    </span>
  );
}
