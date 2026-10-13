import { Pause, Play } from "lucide-react";
import { IconButton } from "../components/IconButton.tsx";
import { formatTimestamp } from "../media/formatTimestamp.ts";

/**
 * The compact player of the audio a book is aligned with, shown above the progress slider:
 * play and pause, the time played and the whole length, and a slider to move through the audio.
 * The slider waits until the audio's length is known; a failure to play takes its place.
 */
export function ReaderAudioBar({
  isPlaying,
  currentMs,
  durationMs,
  failure,
  onTogglePlay,
  onSeek,
}: {
  isPlaying: boolean;
  currentMs: number;
  /** Zero until the player has loaded the audio. */
  durationMs: number;
  /** Why the audio cannot play, or null. */
  failure: string | null;
  onTogglePlay: () => void;
  onSeek: (ms: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-fg-muted tabular-nums">
      <IconButton
        label={isPlaying ? "Pause the audio (K)" : "Play the audio (K)"}
        disabled={failure !== null}
        onClick={onTogglePlay}
      >
        {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
      </IconButton>
      {failure === null ? (
        <>
          <span>{formatTimestamp(currentMs)}</span>
          <input
            type="range"
            aria-label="Position in the audio"
            aria-valuetext={formatTimestamp(currentMs)}
            min={0}
            max={durationMs}
            value={Math.min(currentMs, durationMs)}
            disabled={durationMs === 0}
            onChange={(event) => onSeek(Number(event.target.value))}
            className="min-w-0 flex-1 accent-accent"
          />
          <span>{durationMs === 0 ? "–:––" : formatTimestamp(durationMs)}</span>
        </>
      ) : (
        <p role="status" className="min-w-0 flex-1 truncate text-danger-fg">
          {failure}
        </p>
      )}
    </div>
  );
}
