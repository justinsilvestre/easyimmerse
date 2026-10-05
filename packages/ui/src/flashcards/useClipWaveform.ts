import type { AudioClip, MediaFile } from "@easyimmerse/types";
import { useMemo } from "react";
import { useWaveformFetch } from "../components/waveform/useWaveformFetch.ts";
import { useWaveformWindows } from "../components/waveform/useWaveformWindows.ts";
import type { MediaWaveform } from "./FlashcardEditorFields.tsx";
import { peaksFromWindows } from "./peaksFromWindows.ts";

/** How much of the file around the clip is loaded, so that a handle can be dragged past the clip's edges. */
const marginMs = 60_000;

/**
 * The waveform the flashcard editor draws around a clip, loaded from the server's peaks windows.
 * Null for a file the server cannot read, such as one the browser holds, or before the duration is known.
 */
export function useClipWaveform(
  projectId: string,
  mediaFile: MediaFile | null,
  durationMs: number,
  clip: AudioClip | null,
): MediaWaveform | null {
  const fetchWindow = useWaveformFetch(projectId, mediaFile);
  const isReadable = mediaFile?.source.kind === "path" && durationMs > 0;
  const windows = useWaveformWindows(fetchWindow, {
    viewStartMs: Math.max(0, (clip?.start_ms ?? 0) - marginMs),
    viewEndMs: Math.min(durationMs, (clip?.end_ms ?? 0) + marginMs),
    focusMs: clip?.start_ms ?? 0,
    durationMs: isReadable && clip !== null ? durationMs : 0,
  });
  const peaks = useMemo(
    () => (isReadable ? peaksFromWindows(windows, durationMs) : []),
    [isReadable, windows, durationMs],
  );
  return isReadable && clip !== null ? { peaks, durationMs } : null;
}
