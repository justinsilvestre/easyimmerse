import type { AnkiExportScope } from "@easyimmerse/state";
import { Button } from "../components/Button.tsx";
import { CheckboxField } from "../components/CheckboxField.tsx";
import { ModalDialog } from "../components/ModalDialog.tsx";
import { pluralize } from "../components/pluralize.ts";
import { SegmentedControl } from "../components/SegmentedControl.tsx";
import type { MediaItem } from "./MediaList.tsx";

/**
 * Exports a project's flashcards as an Anki package: the cards in the Anki updates queue or all of them, from every media file or the ticked ones,
 * taking them out of the queue or keeping them in it. Export is unavailable while the choices include no card, and while an export is under way.
 */
export function AnkiExportDialog({
  mediaFiles,
  chosenMediaFileIds,
  scope,
  newAndChangedCount,
  allCount,
  marksExported,
  duplicateCount,
  usesAnkiConnect,
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
  /** The cards in the Anki updates queue, new or changed since an export last took them out of it, from the chosen media files. */
  newAndChangedCount: number;
  /** Every card from the chosen media files. */
  allCount: number;
  /** Whether the export takes its cards out of the Anki updates queue, so that they no longer count as new or changed. */
  marksExported: boolean;
  /** The exported cards that AnkiConnect put into Anki before any export took them out of the queue, which an import there would duplicate. */
  duplicateCount: number;
  /** Whether the project uses AnkiConnect, which deletes the notes of deleted flashcards from Anki, as no package can. */
  usesAnkiConnect: boolean;
  isBusy: boolean;
  onScopeChange: (scope: AnkiExportScope) => void;
  onMarkingChange: (marksExported: boolean) => void;
  onMediaToggle: (mediaFileId: string) => void;
  onExport: () => void;
  onClose: () => void;
}) {
  const count = scope === "newAndChanged" ? newAndChangedCount : allCount;
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
            disabled={count === 0 || isBusy}
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
            label: `Queued cards (${newAndChangedCount})`,
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
        label="Keep these cards in the Anki updates queue"
        hint="Choose this for a copy such as a deck you share or keep as a backup, not one to import into the Anki that this project sends to. Otherwise the export takes the cards out of the queue, and the next export leaves them out unless they change."
        checked={!marksExported}
        onChange={(event) => onMarkingChange(!event.target.checked)}
      />
      {duplicateCount > 0 && <DuplicateWarning count={duplicateCount} />}
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
        <p>
          {usesAnkiConnect
            ? "A package cannot delete notes from Anki, but AnkiConnect deletes the notes of the flashcards you delete."
            : "A package cannot delete notes from Anki. When you delete a flashcard that went out in a package, delete its note in Anki yourself, or turn on AnkiConnect, which deletes the notes of the flashcards you delete."}
        </p>
      </div>
    </ModalDialog>
  );
}

/** Names what Export writes: the cards the package holds. */
function exportLabel(count: number, isBusy: boolean) {
  return isBusy ? "Exporting…" : `Export ${pluralize(count, "card")}`;
}

/**
 * Warns that some of the cards are already in the Anki that AnkiConnect sends to, under notes whose GUIDs Anki chose,
 * so that importing the package there would add a second note for each, and tells how Anki's browser finds such doubles:
 * the easyImmerse id field is unique to each flashcard, so Find Duplicates on it lists exactly the doubled notes.
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
      {sent} You can find any doubled notes with Notes &gt; Find Duplicates in
      Anki's browser, searching the “easyImmerse id” field.
    </p>
  );
}
