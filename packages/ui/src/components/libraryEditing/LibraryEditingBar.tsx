import { Button } from "../common/Button.tsx";

/**
 * The line above the player or the reader while a library manager prepares an item there:
 * it tells how to give text an entry for learners, and its button leads to the item's details, where it is published.
 */
export function LibraryEditingBar({
  kind,
  onOpenDetails,
}: {
  /** Whether the item's text is subtitles or the paragraphs of a document. */
  kind: "subtitles" | "text";
  onOpenDetails: () => void;
}) {
  return (
    <section
      aria-label="Preparing for learners"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
    >
      <p className="min-w-0 flex-1 text-fg-muted">
        {`You are preparing this item for learners. Click a word or select any text in the ${kind} to give it an entry from your dictionaries. Underlined words have one.`}
      </p>
      <Button size="sm" onClick={onOpenDetails}>
        Item details
      </Button>
    </section>
  );
}
