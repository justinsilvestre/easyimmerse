import { FilePlus } from "lucide-react";
import { IconButton } from "../components/IconButton.tsx";
import type {
  SubtitleTrackChoices,
  SubtitleTrackOption,
} from "./SubtitleTrackChoices.ts";

/** The row at the top of the subtitles panel for choosing the subtitle tracks and adding a subtitles file. */
export function SubtitleTrackBar({
  tracks,
  onTargetChange,
  onTranslationChange,
  onAddFile,
}: {
  tracks: SubtitleTrackChoices;
  onTargetChange: (trackId: string | null) => void;
  onTranslationChange: (trackId: string | null) => void;
  onAddFile: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5 border-b border-line px-2 py-1.5">
      <TrackSelect
        label="Subtitles"
        value={tracks.targetSubtitlesId}
        noneLabel="No subtitles"
        tracks={tracks.subtitles}
        onChange={onTargetChange}
      />
      <TrackSelect
        label="Translation subtitles"
        value={tracks.translationSubtitlesId}
        noneLabel="No translation"
        tracks={tracks.subtitles}
        onChange={onTranslationChange}
      />
      <IconButton label="Add a subtitles file" onClick={onAddFile}>
        <FilePlus className="size-4" />
      </IconButton>
    </div>
  );
}

function TrackSelect({
  label,
  value,
  noneLabel,
  tracks,
  onChange,
}: {
  label: string;
  value: string | null;
  noneLabel: string;
  tracks: readonly SubtitleTrackOption[];
  onChange: (trackId: string | null) => void;
}) {
  return (
    <select
      aria-label={label}
      title={label}
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value || null)}
      className="min-w-0 flex-1 rounded-md border border-line bg-surface px-1.5 py-1 text-xs text-fg-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
    >
      <option value="">{noneLabel}</option>
      {tracks.map((track) => (
        <option key={track.id} value={track.id}>
          {track.label}
        </option>
      ))}
    </select>
  );
}
