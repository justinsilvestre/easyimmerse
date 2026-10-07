import clsx from "clsx";
import { Captions, ChevronDown, FilePlus } from "lucide-react";
import { useState } from "react";
import { IconButton } from "../components/IconButton.tsx";
import { languageName } from "../projects/languages.ts";
import type {
  SubtitleTrackChoices,
  SubtitleTrackOption,
} from "./SubtitleTrackChoices.ts";

/**
 * The row at the top of the subtitles panel for choosing the subtitle tracks and adding a subtitles file.
 * Each choice is named for the project language it serves, such as "Japanese subtitles", inside its list and as its tooltip.
 * On a narrow screen the row folds into one line naming the chosen tracks, which opens the choices when pressed.
 */
export function SubtitleTrackBar({
  tracks,
  languages,
  onTargetChange,
  onTranslationChange,
  onAddFile,
}: {
  tracks: SubtitleTrackChoices;
  /** The project's target and translation languages, as BCP 47 tags. */
  languages: { target: string; translation: string };
  onTargetChange: (trackId: string | null) => void;
  onTranslationChange: (trackId: string | null) => void;
  onAddFile: () => void;
}) {
  const [isExpanded, setExpanded] = useState(false);
  const chosen = chosenTrackNames(tracks);
  return (
    <div className="border-b border-line">
      <button
        type="button"
        aria-label={`Subtitle tracks: ${chosen}`}
        aria-expanded={isExpanded}
        onClick={() => setExpanded(!isExpanded)}
        className="flex w-full items-center gap-1.5 px-3 py-1 text-xs text-fg-muted hover:text-fg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent md:hidden"
      >
        <Captions className="size-3.5 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-left">{chosen}</span>
        <ChevronDown
          className={clsx(
            "size-3.5 shrink-0 transition-transform",
            isExpanded && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      <div
        className={clsx(
          "items-center gap-1.5 px-2 pb-1.5 md:py-1.5",
          isExpanded ? "flex" : "hidden md:flex",
        )}
      >
        <TrackSelect
          label={`${languageName(languages.target)} subtitles`}
          value={tracks.targetSubtitlesId}
          tracks={tracks.subtitles}
          onChange={onTargetChange}
        />
        <TrackSelect
          label={`${languageName(languages.translation)} subtitles`}
          value={tracks.translationSubtitlesId}
          tracks={tracks.subtitles}
          onChange={onTranslationChange}
        />
        <IconButton label="Add a subtitles file" onClick={onAddFile}>
          <FilePlus className="size-4" />
        </IconButton>
      </div>
    </div>
  );
}

/** Names the chosen tracks, the target language's first, or says that none is chosen. */
function chosenTrackNames(tracks: SubtitleTrackChoices): string {
  const names = [tracks.targetSubtitlesId, tracks.translationSubtitlesId]
    .map((id) => tracks.subtitles.find((track) => track.id === id)?.label)
    .filter((label) => label !== undefined);
  return names.length > 0 ? names.join(" · ") : "No subtitle tracks";
}

function TrackSelect({
  label,
  value,
  tracks,
  onChange,
}: {
  label: string;
  value: string | null;
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
      <optgroup label={label}>
        <option value="">None</option>
        {tracks.map((track) => (
          <option key={track.id} value={track.id}>
            {track.label}
          </option>
        ))}
      </optgroup>
    </select>
  );
}
