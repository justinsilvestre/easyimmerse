import { useLazyGetWaveformWindowQuery } from "@easyimmerse/backend";
import type { MediaFile } from "@easyimmerse/types";
import { useMemo } from "react";
import type { FetchWaveformWindow } from "./waveformWindowStore.ts";

/** A file the browser holds has no waveform, so every window is reported as missing. */
const fetchNoWaveformWindow: FetchWaveformWindow = async () => null;

/** Loads peaks windows from the waveform route for a file on the server's disk. */
export function useWaveformFetch(
  projectId: string,
  mediaFile: MediaFile | null,
): FetchWaveformWindow {
  const [fetchWaveform] = useLazyGetWaveformWindowQuery();
  const mediaFileId = mediaFile?.source.kind === "path" ? mediaFile.id : null;
  return useMemo<FetchWaveformWindow>(() => {
    if (mediaFileId === null) return fetchNoWaveformWindow;
    return async (startMs, endMs) => {
      const response = await fetchWaveform(
        { projectId, mediaFileId, startMs, endMs },
        true,
      ).unwrap();
      return response.peaks.length === 0
        ? null
        : Uint8Array.from(response.peaks);
    };
  }, [fetchWaveform, projectId, mediaFileId]);
}
