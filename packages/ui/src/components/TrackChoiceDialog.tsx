import { useId, useState } from "react";
import { Button } from "./Button.tsx";
import { DialogActions, ModalDialog } from "./ModalDialog.tsx";
import type { TrackChoice } from "./trackChoiceLabels.ts";
import { trackLabels } from "./trackChoiceLabels.ts";

/** The chosen stream index of each kind, or null when the file has no track of that kind. */
export type TrackSelection = { video: number | null; audio: number | null };

/** Lets the user pick one video and one audio track before a file with several of either plays. */
export function TrackChoiceDialog({
  videoTracks,
  audioTracks,
  initialSelection,
  onChoose,
  onCancel,
}: {
  videoTracks: readonly TrackChoice[];
  audioTracks: readonly TrackChoice[];
  /** The saved choice to start from. Without one, the default-flagged track of each kind is selected, else the first. */
  initialSelection?: TrackSelection;
  onChoose: (selection: TrackSelection) => void;
  onCancel: () => void;
}) {
  const [selection, setSelection] = useState<TrackSelection>(
    () =>
      initialSelection ?? {
        video: preferredTrack(videoTracks),
        audio: preferredTrack(audioTracks),
      },
  );
  return (
    <ModalDialog title="Choose tracks" onCancel={onCancel}>
      {videoTracks.length > 0 && (
        <TrackGroup
          legend="Video"
          tracks={videoTracks}
          selected={selection.video}
          onSelect={(video) => setSelection({ ...selection, video })}
        />
      )}
      {audioTracks.length > 0 && (
        <TrackGroup
          legend="Audio"
          tracks={audioTracks}
          selected={selection.audio}
          onSelect={(audio) => setSelection({ ...selection, audio })}
        />
      )}
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="primary" autoFocus onClick={() => onChoose(selection)}>
          Choose
        </Button>
      </DialogActions>
    </ModalDialog>
  );
}

function preferredTrack(tracks: readonly TrackChoice[]): number | null {
  const preferred = tracks.find((track) => track.isDefault) ?? tracks[0];
  return preferred?.streamIndex ?? null;
}

function TrackGroup({
  legend,
  tracks,
  selected,
  onSelect,
}: {
  legend: string;
  tracks: readonly TrackChoice[];
  selected: number | null;
  onSelect: (streamIndex: number) => void;
}) {
  const groupName = useId();
  const labels = trackLabels(tracks);
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium text-fg-muted">
        {legend}
      </legend>
      {tracks.map((track, index) => (
        <TrackOption
          key={track.streamIndex}
          track={track}
          label={labels[index] ?? ""}
          groupName={groupName}
          checked={track.streamIndex === selected}
          onSelect={() => onSelect(track.streamIndex)}
        />
      ))}
    </fieldset>
  );
}

function TrackOption({
  track,
  label,
  groupName,
  checked,
  onSelect,
}: {
  track: TrackChoice;
  label: string;
  groupName: string;
  checked: boolean;
  onSelect: () => void;
}) {
  const nameId = useId();
  const formatId = useId();
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded border border-line px-3 py-2 has-checked:border-accent has-checked:bg-accent-soft">
      <input
        type="radio"
        name={groupName}
        className="mt-1"
        checked={checked}
        aria-labelledby={nameId}
        aria-describedby={formatId}
        onChange={onSelect}
      />
      <span className="flex flex-col">
        <span id={nameId} className="text-sm">
          {label}
        </span>
        <span id={formatId} className="text-xs text-fg-muted">
          {track.isDefault ? `${track.format} · Default` : track.format}
        </span>
      </span>
    </label>
  );
}
