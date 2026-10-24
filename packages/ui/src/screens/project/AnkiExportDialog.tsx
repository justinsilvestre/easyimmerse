import type { AnkiExportScope } from "@easyimmerse/state";
import { type ReactNode, useId } from "react";
import { Button } from "../../components/common/Button.tsx";
import { CheckboxField } from "../../components/common/CheckboxField.tsx";
import { ModalDialog } from "../../components/common/ModalDialog.tsx";
import { SegmentedControl } from "../../components/common/SegmentedControl.tsx";
import { pluralize } from "../../lib/formatting/pluralize.ts";
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
      title="Export an Anki deck package"
      description="Save your flashcards in .apkg format for use in Anki."
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
          <legend className="pb-2 text-sm font-medium">
            Including{" "}
            {scope === "newAndChanged" ? "newly added or updated" : "all"} cards
            from:
          </legend>
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

      {duplicateCount > 0 && <DuplicateWarning count={duplicateCount} />}
      <div className="flex flex-col gap-2 text-sm text-fg-muted">
        <p>
          <b>Technical limitation:</b> an .apkg import cannot delete notes from
          Anki. When you delete a card in easyImmerse after adding it to Anki
          via .apkg import, its note stays in Anki until you delete it there
          yourself. Consider using AnkiConnect if you are concerned with keeping
          your Anki collection in sync with easyImmerse.
        </p>
        <p>
          If this .apkg file contains cards that you previously imported into
          Anki via .apkg, their content will be overwritten, but your review
          progress for these cards will be preserved.
        </p>
        <QueueChoice
          marksExported={marksExported}
          onMarkingChange={onMarkingChange}
        />
      </div>
    </ModalDialog>
  );
}

/** Names what Export writes: the cards the package holds. */
function exportLabel(count: number, isBusy: boolean) {
  return isBusy ? "Exporting…" : `Export ${pluralize(count, "card")}`;
}

/** Asks whether the export keeps its cards in the Anki updates queue, saying beside each answer when it suits. */
function QueueChoice({
  marksExported,
  onMarkingChange,
}: {
  marksExported: boolean;
  onMarkingChange: (marksExported: boolean) => void;
}) {
  const groupName = useId();
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="pb-2 font-medium text-fg">
        Flush these cards from the Anki updates queue after export?
      </legend>
      <QueueOption
        label="Yes"
        groupName={groupName}
        checked={marksExported}
        onSelect={() => onMarkingChange(true)}
      >
        Choose this if you are making this .apkg deck to{" "}
        <strong>update your own Anki collection</strong> right now.
      </QueueOption>
      <QueueOption
        label="No"
        groupName={groupName}
        checked={!marksExported}
        onSelect={() => onMarkingChange(false)}
      >
        Choose this if you'd like to{" "}
        <strong>send these updates to Anki later</strong> (e.g. via
        AnkiConnect), but you still want this .apkg to share your deck with
        someone else or as a backup.
      </QueueOption>
    </fieldset>
  );
}

function QueueOption({
  label,
  groupName,
  checked,
  onSelect,
  children,
}: {
  label: string;
  groupName: string;
  checked: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  const labelId = useId();
  const hintId = useId();
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded border border-line px-3 py-2 has-checked:border-accent has-checked:bg-accent-soft">
      <input
        type="radio"
        name={groupName}
        className="mt-1"
        checked={checked}
        aria-labelledby={labelId}
        aria-describedby={hintId}
        onChange={onSelect}
      />
      <span className="flex flex-col">
        <span id={labelId} className="text-fg">
          {label}
        </span>
        <span id={hintId} className="text-xs">
          {children}
        </span>
      </span>
    </label>
  );
}

function DuplicateWarning({ count }: { count: number }) {
  return (
    <p
      role="note"
      className="rounded-md border border-warning-line bg-warning-soft p-3 text-sm text-warning-fg"
    >
      If possible, please <strong>continue using AnkiConnect</strong> rather
      than .apkg import to update your Anki collection. Importing an .apkg file
      that includes cards already added via AnkiConnect may result in duplicate
      notes/cards inside your Anki collection.
      <br />
      <br />
      {count === 1 ? (
        <>
          <strong>1 card</strong> in this package has
        </>
      ) : (
        <>
          <strong>{count} cards</strong> in this package have
        </>
      )}{" "}
      already been sent to Anki through AnkiConnect. To find duplicate notes in
      your Anki collection, navigate to <i>Notes &gt; Find Duplicates</i> within
      the Anki card browser, and search on the “easyImmerse id” field.
    </p>
  );
}
