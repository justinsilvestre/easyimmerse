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
import type { PlaybackState, TrackSelection } from "./playback.ts";

export type PlayerCallbacks = {
  onTogglePlay: () => void;
  onSeek: (ms: number) => void;
  /** Skips to the previous or next cue, or by a few seconds when there are no cues. */
  onSkip: (direction: "back" | "forward") => void;
  onVolumeChange: (volume: number) => void;
  onSpeedChange: (speed: number) => void;
  onAudioTrackChange: (trackId: string) => void;
  /** Cycles which subtitles lie over the video: both, the target language, or the translation. */
  onToggleSubtitleDisplay: () => void;
  onToggleCuePanel: () => void;
  onToggleWaveform: () => void;
  onToggleDistractionFree: () => void;
};

const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

/** The bar under the player: the position, transport, volume, speed, and audio track, with the toggles for the panels around it. */
export function PlayerControls({
  playback,
  tracks,
  panels,
  callbacks,
}: {
  playback: PlaybackState;
  tracks: TrackSelection;
  panels: { cues: boolean; waveform: boolean };
  callbacks: PlayerCallbacks;
}) {
  return (
    <div className="flex flex-col gap-1.5 border-t border-line bg-surface px-3 py-2">
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
          label="Previous cue"
          onClick={() => callbacks.onSkip("back")}
        >
          <SkipBack className="size-4" />
        </IconButton>
        <IconButton
          label={playback.isPlaying ? "Pause" : "Play"}
          onClick={callbacks.onTogglePlay}
        >
          {playback.isPlaying ? (
            <Pause className="size-5" />
          ) : (
            <Play className="size-5" />
          )}
        </IconButton>
        <IconButton
          label="Next cue"
          onClick={() => callbacks.onSkip("forward")}
        >
          <SkipForward className="size-4" />
        </IconButton>
        <label className="ml-2 flex items-center gap-1 text-fg-muted">
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
        {tracks.audio.length > 1 && (
          <CompactSelect
            label="Audio track"
            value={tracks.audioId ?? ""}
            options={tracks.audio.map((track) => ({
              value: track.id,
              label: track.label,
            }))}
            onChange={callbacks.onAudioTrackChange}
          />
        )}
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
