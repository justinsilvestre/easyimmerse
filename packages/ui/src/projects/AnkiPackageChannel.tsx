import type { AnkiUpdatesQueue, PackageSync } from "@easyimmerse/state";
import { Download } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "../components/Button.tsx";
import { Count } from "./Count.tsx";
import { DeletedInAnki } from "./DeletedInAnki.tsx";
import { FlashcardsColumns } from "./FlashcardsColumns.tsx";
import { newAndChangedPhrase } from "./newAndChangedPhrase.ts";
import { QueueSummary } from "./QueueSummary.tsx";

/**
 * Shows the Anki deck package while it is how the flashcards reach Anki: what waits in the Anki updates queue, with a `preview` of the next card,
 * the button to export, and the deleted flashcards whose notes may still be in Anki.
 */
export function AnkiPackageChannel({
  queue,
  sync,
  flashcardCount,
  preview,
  onExportPackage,
  onCopyAnkiSearch,
  onMarkDeletionsDone,
}: {
  queue: AnkiUpdatesQueue;
  sync: PackageSync;
  /** Every flashcard of the project. */
  flashcardCount: number;
  /** The next card in the Anki updates queue, or null when the queue is empty. */
  preview: ReactNode;
  onExportPackage: () => void;
  onCopyAnkiSearch: () => void;
  onMarkDeletionsDone: () => void;
}) {
  const hasFlashcards = flashcardCount > 0;
  return (
    <FlashcardsColumns
      queue={
        hasFlashcards ? (
          <QueueSummary summary={queueSummary(queue)} preview={preview} />
        ) : null
      }
      action={
        <Button variant="primary" onClick={onExportPackage}>
          <Download className="size-4" aria-hidden />
          Export .apkg file
        </Button>
      }
    >
      {!hasFlashcards && <p>No flashcards yet.</p>}
      {sync.deletions.length > 0 && (
        <DeletedInAnki
          deletions={sync.deletions}
          ankiSearch={sync.ankiSearch}
          onCopyAnkiSearch={onCopyAnkiSearch}
          onMarkDone={onMarkDeletionsDone}
        />
      )}
    </FlashcardsColumns>
  );
}

/** Counts the flashcards in the Anki updates queue. */
function queueSummary({ newCount, changedCount }: AnkiUpdatesQueue) {
  if (newCount + changedCount === 0)
    return "No flashcards waiting to be exported.";
  return (
    <>
      <Count>{newAndChangedPhrase(newCount, changedCount)}</Count> waiting to be
      exported.
    </>
  );
}
