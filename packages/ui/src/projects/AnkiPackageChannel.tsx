import type { PackageSync } from "@easyimmerse/state";
import { Download } from "lucide-react";
import { Button } from "../components/Button.tsx";
import { DeletedInAnki } from "./DeletedInAnki.tsx";
import { newAndChangedPhrase } from "./newAndChangedPhrase.ts";
import { SyncChannel } from "./SyncChannel.tsx";

/**
 * Shows the Anki package, which can always be exported: what waits in the Anki updates queue, the button to export,
 * and the deleted flashcards whose notes may still be in Anki.
 */
export function AnkiPackageChannel({
  sync,
  flashcardCount,
  isMainChannel,
  onExportPackage,
  onCopyAnkiSearch,
  onMarkDeletionsDone,
}: {
  sync: PackageSync;
  /** Every flashcard of the project. */
  flashcardCount: number;
  /** Whether packages are how the flashcards reach Anki, as while AnkiConnect is off, which makes Export the main button. */
  isMainChannel: boolean;
  onExportPackage: () => void;
  onCopyAnkiSearch: () => void;
  onMarkDeletionsDone: () => void;
}) {
  return (
    <SyncChannel
      icon={<Download className="size-5" aria-hidden />}
      title="Anki package"
    >
      <p>{packageSummary(sync, flashcardCount, isMainChannel)}</p>
      <div className="pt-1">
        <Button
          variant={isMainChannel ? "primary" : "secondary"}
          onClick={onExportPackage}
        >
          <Download className="size-4" aria-hidden />
          Export an Anki deck
        </Button>
      </div>
      {sync.deletions.length > 0 && (
        <DeletedInAnki
          deletions={sync.deletions}
          markCount={sync.markCount}
          onCopyAnkiSearch={onCopyAnkiSearch}
          onMarkDone={onMarkDeletionsDone}
        />
      )}
    </SyncChannel>
  );
}

/**
 * Counts the flashcards new and changed since the last export, or says what a package is before the first.
 * It calls them the Anki updates queue only while packages are how the flashcards reach Anki, since AnkiConnect otherwise keeps its own count.
 */
function packageSummary(
  { sinceLastExport }: PackageSync,
  flashcardCount: number,
  isMainChannel: boolean,
) {
  if (flashcardCount === 0) return "No flashcards yet.";
  if (sinceLastExport === null) return "Save a package to import into Anki.";
  const { newCount, changedCount } = sinceLastExport;
  const isEmpty = newCount + changedCount === 0;
  if (!isMainChannel)
    return isEmpty
      ? "Every flashcard has been exported."
      : `${newAndChangedPhrase(newCount, changedCount)} since the last export.`;
  return isEmpty
    ? "No new or changed flashcards in the Anki updates queue."
    : `${newAndChangedPhrase(newCount, changedCount)} in the Anki updates queue.`;
}
