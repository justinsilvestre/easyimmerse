import type { AvailableSubtitle } from "@easyimmerse/types";
import { useState } from "react";
import { Button } from "../components/Button.tsx";
import { ModalDialog } from "../components/ModalDialog.tsx";
import { SourceSubtitlesChoice } from "../projects/SourceSubtitlesChoice.tsx";
import {
  defaultSubtitleChoice,
  type ProjectLanguages,
} from "../projects/sourceSubtitleDefaults.ts";

/**
 * Offers the subtitle tracks that a fetched media file's source still has, for fetching
 * after the media itself. The list comes from the plugin that fetched the media, which
 * takes a moment; the tracks the media file already has are marked, and the first track
 * in each project language that it lacks is preselected.
 */
export function FetchSourceSubtitlesDialog({
  subtitles,
  error,
  existingNames,
  languages,
  isFetching,
  onFetch,
  onCancel,
}: {
  /** The tracks the source offers, or null while they are being asked for. */
  subtitles: readonly AvailableSubtitle[] | null;
  /** Why the tracks could not be listed or fetched, or null. */
  error: string | null;
  /** The names of the media file's subtitle tracks. */
  existingNames: readonly string[];
  languages: ProjectLanguages;
  isFetching: boolean;
  onFetch: (subtitles: string[]) => void;
  onCancel: () => void;
}) {
  const [chosen, setChosen] = useState<readonly string[] | null>(null);
  const selectedIds =
    chosen ??
    (subtitles
      ? defaultSubtitleChoice(subtitles, languages, existingNames)
      : []);
  const canFetch = subtitles !== null && selectedIds.length > 0 && !isFetching;
  const toggle = (id: string, isSelected: boolean) =>
    setChosen(
      isSelected
        ? [...selectedIds, id]
        : selectedIds.filter((selected) => selected !== id),
    );
  return (
    <ModalDialog
      title="Fetch subtitles from the source"
      description="The subtitles are fetched through the plugin that fetched the media."
      onCancel={onCancel}
      footer={
        <>
          <Button onClick={onCancel}>Cancel</Button>
          <Button
            variant="primary"
            aria-disabled={!canFetch}
            onClick={() => {
              if (canFetch) onFetch([...selectedIds]);
            }}
          >
            {isFetching ? "Fetching…" : "Fetch"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {subtitles === null && error === null && (
          <p className="text-sm text-fg-muted" role="status">
            Asking the source which subtitles it has…
          </p>
        )}
        {subtitles && (
          <SourceSubtitlesChoice
            subtitles={subtitles}
            selectedIds={selectedIds}
            alreadyAdded={existingNames}
            disabled={isFetching}
            onToggle={toggle}
          />
        )}
        {error !== null && (
          <p className="text-sm text-danger-fg" role="alert">
            {error}
          </p>
        )}
      </div>
    </ModalDialog>
  );
}
