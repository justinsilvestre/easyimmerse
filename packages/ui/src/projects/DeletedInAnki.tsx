import type { AnkiPendingDeletion } from "@easyimmerse/types";
import { Button } from "../components/Button.tsx";
import { pluralize } from "../components/pluralize.ts";

/**
 * Lists the deleted flashcards whose notes may still be in Anki, by word, with a button that copies the Anki search
 * finding their notes and one that marks them done.
 */
export function DeletedInAnki({
  deletions,
  markCount,
  onCopyAnkiSearch,
  onMarkDone,
}: {
  deletions: readonly AnkiPendingDeletion[];
  /** How many of them the next export marking its cards as exported marks for deletion. */
  markCount: number;
  onCopyAnkiSearch: () => void;
  onMarkDone: () => void;
}) {
  return (
    <div className="flex w-full flex-col gap-2 rounded-md bg-surface-muted p-3">
      <h4 className="font-medium">
        {pluralize(deletions.length, "deleted flashcard")} to delete in Anki
      </h4>
      <ul className="flex flex-wrap gap-x-3 gap-y-1">
        {deletions.map(({ flashcard_id, word }) => (
          <li key={flashcard_id}>{word || "A flashcard without a word"}</li>
        ))}
      </ul>
      <p className="text-fg-muted">
        {deletionsHint(deletions.length, markCount)}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={onCopyAnkiSearch}>
          Copy Anki search
        </Button>
        <Button size="sm" variant="subtle" onClick={onMarkDone}>
          Mark as done
        </Button>
      </div>
    </div>
  );
}

/** Tells how to delete the notes in Anki, and how many of them the next export marks for deletion instead. */
function deletionsHint(count: number, markCount: number) {
  const search =
    "Paste the search into Anki's browser to find their notes, delete them there, then mark them as done.";
  if (markCount === 0) return search;
  const which = markCount === count ? "them" : `${markCount} of them`;
  return `${search} Otherwise, the next export that marks its cards as exported marks ${which} for deletion.`;
}
