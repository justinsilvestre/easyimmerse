import type { AvailableSubtitle } from "@easyimmerse/types";
import { CheckboxField } from "../components/CheckboxField.tsx";

/** The subtitle tracks a source offers, each with a checkbox for whether to fetch it. */
export function SourceSubtitlesChoice({
  subtitles,
  selectedIds,
  alreadyAdded = [],
  disabled = false,
  onToggle,
}: {
  subtitles: readonly AvailableSubtitle[];
  selectedIds: readonly string[];
  /** The names of tracks the media file already has, which are marked as such. */
  alreadyAdded?: readonly string[];
  disabled?: boolean;
  onToggle: (id: string, isSelected: boolean) => void;
}) {
  if (subtitles.length === 0) {
    return (
      <p className="text-sm text-fg-muted">The source offers no subtitles.</p>
    );
  }
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1 text-sm font-medium">Subtitles to fetch</legend>
      <div className="flex max-h-56 flex-col gap-1.5 overflow-y-auto">
        {subtitles.map((subtitle) => (
          <CheckboxField
            key={subtitle.id}
            label={subtitle.name}
            hint={
              alreadyAdded.includes(subtitle.name) ? "Already added" : undefined
            }
            checked={selectedIds.includes(subtitle.id)}
            disabled={disabled}
            onChange={(event) => onToggle(subtitle.id, event.target.checked)}
          />
        ))}
      </div>
    </fieldset>
  );
}
