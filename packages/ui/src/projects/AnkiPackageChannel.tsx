import type { PackageSync } from "@easyimmerse/state";
import { Download } from "lucide-react";
import { Button } from "../components/Button.tsx";
import { newAndChangedPhrase } from "./newAndChangedPhrase.ts";
import { SyncChannel } from "./SyncChannel.tsx";

/** Shows the Anki package, which can always be exported: what changed since the last export, and the button to export. */
export function AnkiPackageChannel({
  sync,
  flashcardCount,
  isMainChannel,
  onExportPackage,
}: {
  sync: PackageSync;
  /** Every flashcard of the project. */
  flashcardCount: number;
  /** Whether packages are how the flashcards reach Anki, as while AnkiConnect is off, which makes Export the main button. */
  isMainChannel: boolean;
  onExportPackage: () => void;
}) {
  return (
    <SyncChannel
      icon={<Download className="size-5" aria-hidden />}
      title="Anki package"
    >
      <p>{packageSummary(sync, flashcardCount)}</p>
      <div className="pt-1">
        <Button
          variant={isMainChannel ? "primary" : "secondary"}
          onClick={onExportPackage}
        >
          <Download className="size-4" aria-hidden />
          Export an Anki deck
        </Button>
      </div>
    </SyncChannel>
  );
}

/** Counts the flashcards new and changed since the last export, or says what a package is before the first. */
function packageSummary(
  { sinceLastExport }: PackageSync,
  flashcardCount: number,
) {
  if (flashcardCount === 0) return "No flashcards yet.";
  if (sinceLastExport === null) return "Save a package to import into Anki.";
  const { newCount, changedCount } = sinceLastExport;
  if (newCount + changedCount === 0)
    return "Every flashcard has been exported.";
  return `${newAndChangedPhrase(newCount, changedCount)} since the last export.`;
}
