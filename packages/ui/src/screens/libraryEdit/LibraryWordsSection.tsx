import type { LibraryItem, LibraryText } from "@easyimmerse/types";
import { Button } from "../../components/common/Button.tsx";
import { pluralize } from "../../lib/formatting/pluralize.ts";
import { libraryLockOf, libraryLockText } from "./libraryLock.ts";

/**
 * The words learners can click in a library item, on its details page: how many there are and in how many of its subtitles or paragraphs,
 * and the button that opens the item in the player or the reader as learners see it, where the library manager gives text its entries.
 * While the item is published or being published, the words show there but cannot change.
 */
export function LibraryWordsSection({
  item,
  text,
  isOpening,
  onOpen,
}: {
  item: LibraryItem;
  /** The item's text, or null while it loads. */
  text: LibraryText | null;
  /** Whether the item is being opened, while which the button does nothing. */
  isOpening: boolean;
  onOpen: () => void;
}) {
  const isMedia = item.kind !== "document";
  const lock = libraryLockOf(item.status);
  return (
    <section aria-label="Words" className="flex flex-col gap-3">
      <h2 className="font-semibold">Words</h2>
      {text && (
        <p className="text-sm text-fg-muted">{countsOf(text, isMedia)}</p>
      )}
      {lock && (
        <p className="text-sm text-fg-muted">
          {libraryLockText(lock, "change its words", item.title)}
        </p>
      )}
      {item.file_name !== null && (
        <div className="flex flex-col items-start gap-2">
          {!lock && (
            <p className="text-sm text-fg-muted">
              {`Open “${item.title}” as learners see it, then click a word or select any text in the ${isMedia ? "subtitles" : "text"} to give it an entry from your dictionaries.`}
            </p>
          )}
          <Button
            variant="primary"
            aria-disabled={isOpening || undefined}
            onClick={() => {
              if (!isOpening) onOpen();
            }}
          >
            {isMedia ? "Open in the player" : "Open in the reader"}
          </Button>
        </div>
      )}
    </section>
  );
}

/** Tells how many words learners can click, and in how many of the item's subtitles or paragraphs. */
function countsOf(text: LibraryText, isMedia: boolean): string {
  const unit = isMedia ? "subtitle" : "paragraph";
  const withWords = text.segments.filter(({ words }) => words.length > 0);
  const wordCount = withWords.reduce((sum, { words }) => sum + words.length, 0);
  if (wordCount === 0) return "Learners can click no words yet.";
  return `Learners can click ${pluralize(wordCount, "word")}, in ${withWords.length} of ${pluralize(text.segments.length, unit)}.`;
}
