import { isPlayedByServer } from "@easyimmerse/state";
import type { AudioClip, MediaFile } from "@easyimmerse/types";
import { useMemo } from "react";
import type { MediaWaveform } from "../../components/flashcardEditor/FlashcardEditorFields.tsx";
import { useWaveformWindows } from "../../components/waveform/useWaveformWindows.ts";
import { peaksFromWindows } from "./peaksFromWindows.ts";

/**
 * The waveform the flashcard editor draws around a clip, from the peaks windows the store has loaded for it.
 * Null for a file the server cannot read, such as one only the browser holds, or before the duration is known.
 */
export function useClipWaveform(
  mediaFile: MediaFile | null,
  durationMs: number,
  clip: AudioClip | null,
): MediaWaveform | null {
  const isReadable =
    mediaFile !== null && isPlayedByServer(mediaFile) && durationMs > 0;
  const windows = useWaveformWindows("clip");
  const peaks = useMemo(
    () => (isReadable ? peaksFromWindows(windows, durationMs) : []),
    [isReadable, windows, durationMs],
  );
  return isReadable && clip !== null ? { peaks, durationMs } : null;
}
