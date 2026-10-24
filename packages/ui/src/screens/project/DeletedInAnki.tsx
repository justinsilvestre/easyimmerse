import type { AnkiPendingDeletion } from "@easyimmerse/types";
import { Button } from "../../components/common/Button.tsx";
import { pluralize } from "../../lib/formatting/pluralize.ts";

/**
 * Lists the deleted flashcards whose notes may still be in Anki, by word, with a button that copies the Anki search
 * finding their notes and one that marks them done.
 */
export function DeletedInAnki({
  deletions,
  ankiSearch,
  onCopyAnkiSearch,
  onMarkDone,
}: {
  deletions: readonly AnkiPendingDeletion[];
  ankiSearch: string;
  onCopyAnkiSearch: () => void;
  onMarkDone: () => void;
}) {
  return (
    <div className="flex w-full flex-col gap-2 rounded-md bg-surface-muted p-3">
      <h4 className="font-medium">
        {pluralize(deletions.length, "deleted flashcard")} still in Anki
      </h4>
      <ul className="flex flex-wrap gap-x-3 gap-y-1">
        {deletions.map(({ flashcard_id, word }) => (
          <li key={flashcard_id}>{word || "A flashcard without a word"}</li>
        ))}
      </ul>
      <p className="text-fg-muted">
        You've deleted these flashcards in easyImmerse, but their notes may
        still be in Anki. To remove them from Anki, you can search for them in
        Anki's card browser and delete them from there.
      </p>
      <p className="text-sm text-fg-muted">
        Turn AnkiConnect on to have easyImmerse delete them for you.
      </p>
      <figure>
        <figcaption className="sr-only">Anki search</figcaption>
        <code className="block select-all break-all rounded border border-line bg-surface p-2 font-mono text-xs">
          {ankiSearch}
        </code>
      </figure>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={onCopyAnkiSearch}>
          Copy Anki search
        </Button>
        <Button size="sm" variant="subtle" onClick={onMarkDone}>
          Dismiss this message
        </Button>
      </div>
    </div>
  );
}
