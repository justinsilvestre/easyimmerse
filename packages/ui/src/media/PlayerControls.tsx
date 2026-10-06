import {
  AudioWaveform,
  Captions,
  Expand,
  Languages,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-react";
import { IconButton } from "../components/IconButton.tsx";
import { formatTimestamp } from "./formatTimestamp.ts";
import type { PlayerControlsState } from "./PlayerControlsState.ts";
import type { SubtitleTrackChoices } from "./SubtitleTrackChoices.ts";

export type PlayerCallbacks = {
  onTogglePlay: () => void;
  onSeek: (ms: number) => void;
  /** Skips to the previous or next cue, or by a few seconds when there are no cues. */
  onSkip: (direction: "back" | "forward") => void;
  onVolumeChange: (volume: number) => void;
  onSpeedChange: (speed: number) => void;
  /** Cycles which subtitles lie over the video: both, the target language, or the translation. */
  onToggleSubtitleDisplay: () => void;
  onToggleCuePanel: () => void;
  onToggleWaveform: () => void;
  onToggleDistractionFree: () => void;
};

const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

/**
 * The bar over the bottom of the player: the position, transport, volume, and speed, with the toggles for the panels around it.
 * The transport buttons name their keys in their labels, which show as tooltips.
 */
export function PlayerControls({
  playback,
  tracks,
  panels,
  callbacks,
}: {
  playback: PlayerControlsState;
  tracks: SubtitleTrackChoices;
  panels: { cues: boolean; waveform: boolean };
  callbacks: PlayerCallbacks;
}) {
  return (
    <div className="flex flex-col gap-1.5 bg-surface/90 px-3 py-2 backdrop-blur-sm">
      <div className="flex items-center gap-3 text-xs text-fg-muted tabular-nums">
        <span>{formatTimestamp(playback.currentMs)}</span>
        <input
          type="range"
          aria-label="Position"
          min={0}
          max={playback.durationMs}
          value={playback.currentMs}
          onChange={(event) => callbacks.onSeek(Number(event.target.value))}
          className="flex-1 accent-accent"
        />
        <span>{formatTimestamp(playback.durationMs)}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <IconButton
          label="Previous cue (←)"
          onClick={() => callbacks.onSkip("back")}
        >
          <SkipBack className="size-4" />
        </IconButton>
        <IconButton
          label={playback.isPlaying ? "Pause (Space)" : "Play (Space)"}
          onClick={callbacks.onTogglePlay}
        >
          {playback.isPlaying ? (
            <Pause className="size-5" />
          ) : (
            <Play className="size-5" />
          )}
        </IconButton>
        <IconButton
          label="Next cue (→)"
          onClick={() => callbacks.onSkip("forward")}
        >
          <SkipForward className="size-4" />
        </IconButton>
        {/* Phones and tablets set the volume with their own buttons, so the slider shows only for fine pointers. */}
        <label className="ml-2 hidden items-center gap-1 text-fg-muted pointer-fine:flex">
          <Volume2 className="size-4" aria-hidden />
          <input
            type="range"
            aria-label="Volume"
            min={0}
            max={1}
            step={0.05}
            value={playback.volume}
            onChange={(event) =>
              callbacks.onVolumeChange(Number(event.target.value))
            }
            className="w-20 accent-accent"
          />
        </label>
        <CompactSelect
          label="Playback speed"
          value={String(playback.speed)}
          options={speeds.map((speed) => ({
            value: String(speed),
            label: `${speed}×`,
          }))}
          onChange={(value) => callbacks.onSpeedChange(Number(value))}
        />
        <span className="ml-auto flex items-center gap-1">
          {tracks.translationSubtitlesId !== null && (
            <IconButton
              label="Switch which subtitles are shown"
              onClick={callbacks.onToggleSubtitleDisplay}
            >
              <Languages className="size-4" />
            </IconButton>
          )}
          <IconButton
            label="Subtitles panel"
            pressed={panels.cues}
            onClick={callbacks.onToggleCuePanel}
          >
            <Captions className="size-4" />
          </IconButton>
          <IconButton
            label="Waveform"
            pressed={panels.waveform}
            onClick={callbacks.onToggleWaveform}
          >
            <AudioWaveform className="size-4" />
          </IconButton>
          <IconButton
            label="Distraction-free mode"
            onClick={callbacks.onToggleDistractionFree}
          >
            <Expand className="size-4" />
          </IconButton>
        </span>
      </div>
    </div>
  );
}

function CompactSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      aria-label={label}
      title={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="max-w-36 rounded-md border border-line bg-surface px-1.5 py-1 text-xs text-fg-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
