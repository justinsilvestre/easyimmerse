import {
  AudioLines,
  Languages,
  Pause,
  Play,
  Settings2,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { IconButton } from "../components/IconButton.tsx";
import { MenuButton } from "../components/MenuButton.tsx";
import { formatTimestamp } from "./formatTimestamp.ts";
import type { PlayerControlsState } from "./PlayerControlsState.ts";
import type { SubtitleTrackChoices } from "./SubtitleTrackChoices.ts";

export type PlayerCallbacks = {
  onTogglePlay: () => void;
  onSeek: (ms: number) => void;
  /** Skips to the previous or next cue, or by a few seconds when there are no cues. */
  onSkip: (direction: "back" | "forward") => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onSpeedChange: (speed: number) => void;
  /** Cycles which subtitles lie over the video: both, the target language, or the translation. */
  onToggleSubtitleDisplay: () => void;
  /** Hides the subtitles over the video, or shows them again. */
  onToggleSubtitles: () => void;
  onToggleCuePanel: () => void;
  onToggleWaveform: () => void;
  /** Fills the screen with the app, or leaves it. Absent where the browser offers no fullscreen. */
  onToggleFullscreen?: () => void;
  /** Opens the track choice dialog. Absent when the file offers nothing to choose. */
  onOpenTracks?: () => void;
};

/** Which panels are open, whether the subtitles over the video are hidden, and whether the app fills the screen. */
export type PlayerPanelsState = {
  cues: boolean;
  waveform: boolean;
  areSubtitlesHidden?: boolean;
  /** Tells that the flashcard editor holds the side panel, so that the subtitles panel cannot show and its toggle is marked unavailable. */
  isCuePanelTakenByEditor?: boolean;
  isFullscreen?: boolean;
};

const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

/**
 * The bar over the bottom of the player: the position, transport and volume, with the playback speed
 * and the subtitles over the video in a menu, so that the bar fits on one row on a phone.
 * The buttons name their keys in their labels, which show as tooltips.
 */
export function PlayerControls({
  playback,
  tracks,
  panels,
  callbacks,
}: {
  playback: PlayerControlsState;
  tracks: SubtitleTrackChoices;
  panels: PlayerPanelsState;
  callbacks: PlayerCallbacks;
}) {
  return (
    <div className="flex flex-col gap-1.5 bg-surface/90 px-3 py-2 backdrop-blur-sm">
      <PositionBar playback={playback} onSeek={callbacks.onSeek} />
      <div className="flex flex-nowrap items-center gap-1">
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
        <IconButton
          label={playback.isMuted ? "Unmute (M)" : "Mute (M)"}
          className="ml-2"
          onClick={callbacks.onToggleMute}
        >
          {playback.isMuted ? (
            <VolumeX className="size-4" />
          ) : (
            <Volume2 className="size-4" />
          )}
        </IconButton>
        {/* Phones and tablets set the volume with their own buttons, so the slider shows only for fine pointers. */}
        <label className="hidden min-w-0 items-center text-fg-muted pointer-fine:flex">
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
            className="w-20 min-w-0 accent-accent"
          />
        </label>
        <span className="ml-auto flex shrink-0 items-center gap-1">
          {callbacks.onOpenTracks && (
            <IconButton label="Tracks" onClick={callbacks.onOpenTracks}>
              <AudioLines className="size-4" />
            </IconButton>
          )}
          {tracks.translationSubtitlesId !== null && (
            <IconButton
              label="Switch which subtitles are shown"
              onClick={callbacks.onToggleSubtitleDisplay}
            >
              <Languages className="size-4" />
            </IconButton>
          )}
          <PlaybackOptions
            playback={playback}
            panels={panels}
            callbacks={callbacks}
          />
        </span>
      </div>
    </div>
  );
}

/** The menu of the playback speeds, of which one is checked, and of whether the subtitles show over the video. */
function PlaybackOptions({
  playback,
  panels,
  callbacks,
}: {
  playback: PlayerControlsState;
  panels: PlayerPanelsState;
  callbacks: PlayerCallbacks;
}) {
  return (
    <MenuButton
      label="Playback options"
      icon={<Settings2 className="size-4" />}
      opensUpward
      items={[
        ...speeds.map((speed) => ({
          label: `${speed}× speed`,
          isChecked: playback.speed === speed,
          closesOnSelect: true,
          onSelect: () => callbacks.onSpeedChange(speed),
        })),
        {
          label: "Show subtitles",
          isChecked: panels.areSubtitlesHidden !== true,
          onSelect: callbacks.onToggleSubtitles,
        },
      ]}
    />
  );
}

/**
 * The seek bar with the time on either side. The track behind the slider shows what the player has loaded, as a stream being
 * converted arrives piece by piece, and the part played. The arrows move a second at a time; a `step` would do the same,
 * but would also round the position the bar shows.
 */
function PositionBar({
  playback,
  onSeek,
}: {
  playback: PlayerControlsState;
  onSeek: (ms: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 text-xs text-fg-muted tabular-nums">
      <span>{formatTimestamp(playback.currentMs)}</span>
      <span className="relative flex flex-1 items-center">
        <BufferedTrack playback={playback} />
        <input
          type="range"
          aria-label="Position"
          min={0}
          max={playback.durationMs}
          value={playback.currentMs}
          aria-valuetext={formatTimestamp(playback.currentMs)}
          onChange={(event) => onSeek(Number(event.target.value))}
          onKeyDown={(event) => {
            const directions: Partial<Record<string, number>> = {
              ArrowLeft: -1,
              ArrowDown: -1,
              ArrowRight: 1,
              ArrowUp: 1,
            };
            const direction = directions[event.key];
            if (direction === undefined) return;
            event.preventDefault();
            onSeek(
              Math.min(
                Math.max(playback.currentMs + direction * 1000, 0),
                playback.durationMs,
              ),
            );
          }}
          // The native track is hidden, since the one drawn behind shows the loaded stretches; the thumb stays native.
          className="relative w-full accent-accent [&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:bg-transparent"
        />
      </span>
      <span>{formatTimestamp(playback.durationMs)}</span>
    </div>
  );
}

/** The track behind the slider: the loaded stretches in a lighter shade and the part played in the accent color. */
function BufferedTrack({ playback }: { playback: PlayerControlsState }) {
  const percentOf = (ms: number) =>
    playback.durationMs > 0 ? (100 * ms) / playback.durationMs : 0;
  const span = (fromMs: number, toMs: number) => ({
    left: `${percentOf(fromMs)}%`,
    width: `${percentOf(toMs) - percentOf(fromMs)}%`,
  });
  return (
    <span
      aria-hidden
      data-testid="buffered-track"
      className="pointer-events-none absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-surface-strong"
    >
      {(playback.buffered ?? []).map(({ startSeconds, endSeconds }) => (
        <span
          key={startSeconds}
          data-buffered
          className="absolute inset-y-0 bg-fg-faint"
          style={span(startSeconds * 1000, endSeconds * 1000)}
        />
      ))}
      <span
        className="absolute inset-y-0 bg-accent"
        style={span(0, playback.currentMs)}
      />
    </span>
  );
}
