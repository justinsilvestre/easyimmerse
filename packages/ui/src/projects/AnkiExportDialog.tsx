import type { AnkiExportScope } from "@easyimmerse/state";
import { Button } from "../components/Button.tsx";
import { CheckboxField } from "../components/CheckboxField.tsx";
import { ModalDialog } from "../components/ModalDialog.tsx";
import { pluralize } from "../components/pluralize.ts";
import { SegmentedControl } from "../components/SegmentedControl.tsx";
import type { MediaItem } from "./MediaList.tsx";

/**
 * Exports a project's flashcards as an Anki package: the new cards or all of them, from every media file or the ticked ones.
 * Export is unavailable while the choices include no card, and while an export is under way.
 */
export function AnkiExportDialog({
  mediaFiles,
  chosenMediaFileIds,
  scope,
  newCount,
  allCount,
  isBusy,
  onScopeChange,
  onMediaToggle,
  onExport,
  onClose,
}: {
  mediaFiles: readonly MediaItem[];
  /** The media files whose cards are exported, or null for every card of the project. */
  chosenMediaFileIds: readonly string[] | null;
  scope: AnkiExportScope;
  /** The cards never exported, from the chosen media files. */
  newCount: number;
  /** Every card from the chosen media files. */
  allCount: number;
  isBusy: boolean;
  onScopeChange: (scope: AnkiExportScope) => void;
  onMediaToggle: (mediaFileId: string) => void;
  onExport: () => void;
  onClose: () => void;
}) {
  const count = scope === "new" ? newCount : allCount;
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
            {isBusy ? "Exporting…" : `Export ${pluralize(count, "card")}`}
          </Button>
        </>
      }
    >
      <SegmentedControl
        label="Cards to export"
        options={[
          { value: "new", label: `New cards only (${newCount})` },
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
      <div className="flex flex-col gap-2 text-sm text-fg-muted">
        <p>
          Audio and screenshots are included when the easyImmerse server has
          ffmpeg and can read the media file.
        </p>
        <p>
          Importing a package again adds only the new cards. The look of the
          cards can be changed in Anki once they are imported.
        </p>
      </div>
    </ModalDialog>
  );
}
