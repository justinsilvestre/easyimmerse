import type { AudioClip, MediaFile } from "@easyimmerse/types";
import { useMemo } from "react";
import { useWaveformWindows } from "../components/waveform/useWaveformWindows.ts";
import type { MediaWaveform } from "./FlashcardEditorFields.tsx";
import { peaksFromWindows } from "./peaksFromWindows.ts";

/**
 * The waveform the flashcard editor draws around a clip, from the peaks windows the store has loaded for it.
 * Null for a file the server cannot read, such as one the browser holds, or before the duration is known.
 */
export function useClipWaveform(
  mediaFile: MediaFile | null,
  durationMs: number,
  clip: AudioClip | null,
): MediaWaveform | null {
  const isReadable = mediaFile?.source.kind === "path" && durationMs > 0;
  const windows = useWaveformWindows("clip");
  const peaks = useMemo(
    () => (isReadable ? peaksFromWindows(windows, durationMs) : []),
    [isReadable, windows, durationMs],
  );
  return isReadable && clip !== null ? { peaks, durationMs } : null;
}
