import type { AnkiExportScope } from "@easyimmerse/state";
import { Button } from "../components/Button.tsx";
import { CheckboxField } from "../components/CheckboxField.tsx";
import { ModalDialog } from "../components/ModalDialog.tsx";
import { pluralize } from "../components/pluralize.ts";
import { SegmentedControl } from "../components/SegmentedControl.tsx";
import type { MediaItem } from "./MediaList.tsx";

/**
 * Exports a project's flashcards as an Anki package: the new and changed cards or all of them, from every media file or the ticked ones,
 * marking them as exported or not. Export is unavailable while the choices include no card, and while an export is under way.
 */
export function AnkiExportDialog({
  mediaFiles,
  chosenMediaFileIds,
  scope,
  newAndChangedCount,
  allCount,
  marksExported,
  duplicateCount,
  markCount,
  isBusy,
  onScopeChange,
  onMarkingChange,
  onMediaToggle,
  onExport,
  onClose,
}: {
  mediaFiles: readonly MediaItem[];
  /** The media files whose cards are exported, or null for every card of the project. */
  chosenMediaFileIds: readonly string[] | null;
  scope: AnkiExportScope;
  /** The cards new or changed since they were last marked as exported, from the chosen media files. */
  newAndChangedCount: number;
  /** Every card from the chosen media files. */
  allCount: number;
  /** Whether the export marks its cards as exported, so that they no longer count as new or changed. */
  marksExported: boolean;
  /** The exported cards that AnkiConnect put into Anki before any export marked them, which an import there would duplicate. */
  duplicateCount: number;
  /** The notes of deleted flashcards the package marks for deletion when it marks its cards as exported. */
  markCount: number;
  isBusy: boolean;
  onScopeChange: (scope: AnkiExportScope) => void;
  onMarkingChange: (marksExported: boolean) => void;
  onMediaToggle: (mediaFileId: string) => void;
  onExport: () => void;
  onClose: () => void;
}) {
  const count = scope === "newAndChanged" ? newAndChangedCount : allCount;
  const marks = marksExported ? markCount : 0;
  return (
    <ModalDialog
      title="Export an Anki deck"
      description="Save a package of flashcards to import into Anki."
      onCancel={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={count + marks === 0 || isBusy}
            onClick={onExport}
          >
            {exportLabel(count, isBusy)}
          </Button>
        </>
      }
    >
      <SegmentedControl
        label="Cards to export"
        options={[
          {
            value: "newAndChanged",
            label: `New and changed (${newAndChangedCount})`,
          },
          { value: "all", label: `All cards (${allCount})` },
        ]}
        value={scope}
        onChange={onScopeChange}
      />
      {mediaFiles.length > 0 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="pb-2 text-sm font-medium">From</legend>
          {mediaFiles.map((mediaFile) => (
            <CheckboxField
              key={mediaFile.id}
              label={mediaFile.name}
              hint={pluralize(mediaFile.flashcardCount, "card")}
              checked={chosenMediaFileIds?.includes(mediaFile.id) ?? true}
              onChange={() => onMediaToggle(mediaFile.id)}
            />
          ))}
        </fieldset>
      )}
      <CheckboxField
        label="Mark these cards as exported"
        hint="The next export then leaves them out unless they change. Leave this off for a deck you share or keep as a backup."
        checked={marksExported}
        onChange={(event) => onMarkingChange(event.target.checked)}
      />
      {marksExported && duplicateCount > 0 && (
        <DuplicateWarning count={duplicateCount} />
      )}
      {marks > 0 && (
        <p className="text-sm">
          The package also marks {pluralize(marks, "deleted flashcard")} for
          deletion in Anki.
        </p>
      )}
      <div className="flex flex-col gap-2 text-sm text-fg-muted">
        <p>
          Audio and screenshots are included when the easyImmerse server has
          ffmpeg and can read the media file.
        </p>
        <p>
          Importing a package again adds the new cards and refreshes the others,
          keeping their progress. The look of the cards can be changed in Anki
          once they are imported.
        </p>
      </div>
    </ModalDialog>
  );
}

/** Names what Export writes: the cards it holds, or just the package when it holds only marks for deletion. */
function exportLabel(count: number, isBusy: boolean) {
  if (isBusy) return "Exporting…";
  return count === 0 ? "Export package" : `Export ${pluralize(count, "card")}`;
}

/**
 * Warns that some of the cards are already in the Anki that AnkiConnect sends to, under notes whose GUIDs Anki chose,
 * so that importing the package there would add a second note for each.
 */
function DuplicateWarning({ count }: { count: number }) {
  const sent =
    count === 1
      ? "1 of these cards was sent to Anki through AnkiConnect. Importing this package into that Anki would give you two of that card."
      : `${count} of these cards were sent to Anki through AnkiConnect. Importing this package into that Anki would give you two of each.`;
  return (
    <p
      role="note"
      className="rounded-md border border-warning-line bg-warning-soft p-3 text-sm text-warning-fg"
    >
      {sent}
    </p>
  );
}
