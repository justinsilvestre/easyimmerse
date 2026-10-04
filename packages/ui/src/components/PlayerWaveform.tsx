import {
  skipToken,
  useGetMediaTracksQuery,
  useLazyGetWaveformWindowQuery,
  useListMediaFilesQuery,
} from "@easyimmerse/backend";
import {
  actions,
  selectCurrentTime,
  selectPlayerDuration,
} from "@easyimmerse/state";
import type { MediaFile } from "@easyimmerse/types";
import { useMemo, useState } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { useParsedCues } from "./SubtitlesPanel.tsx";
import { useWaveformWindows } from "./waveform/useWaveformWindows.ts";
import { WaveformStrip } from "./waveform/WaveformStrip.tsx";
import {
  clampVisibleSpan,
  computeViewStart,
} from "./waveform/waveformGeometry.ts";
import type { FetchWaveformWindow } from "./waveform/waveformWindowStore.ts";

const initialVisibleSpanMs = 60_000;

/** A file the browser holds has no waveform, so every window is reported as missing. */
const fetchNoWaveformWindow: FetchWaveformWindow = async () => null;

/** The waveform strip under the player for the open media file, following the store's current time. */
export function PlayerWaveform({
  projectId,
  mediaFileId,
}: {
  projectId: string;
  mediaFileId: string;
}) {
  const dispatch = useAppDispatch();
  const mediaFile = useMediaFile(projectId, mediaFileId);
  const currentTimeMs = useAppSelector(selectCurrentTime) * 1000;
  const durationMs = useDurationMs(projectId, mediaFile);
  const [requestedSpanMs, setRequestedSpanMs] = useState(initialVisibleSpanMs);
  const visibleSpanMs = clampVisibleSpan(requestedSpanMs, durationMs);
  const viewStartMs = computeViewStart(
    currentTimeMs,
    visibleSpanMs,
    durationMs,
  );
  const windows = useWaveformWindows(useWaveformFetch(projectId, mediaFile), {
    viewStartMs,
    viewEndMs: viewStartMs + visibleSpanMs,
    focusMs: currentTimeMs,
    durationMs,
  });
  return (
    <WaveformStrip
      durationMs={durationMs}
      currentTimeMs={currentTimeMs}
      windows={windows}
      cues={useParsedCues()}
      flashcardSegments={[]}
      visibleSpanMs={visibleSpanMs}
      onVisibleSpanChange={setRequestedSpanMs}
      onSeek={(timeMs) => dispatch(actions.seekRequested(timeMs / 1000))}
      onOpenFlashcardSegment={() => undefined}
      onClipEndpointMoved={() => undefined}
      onScreenshotMarkerMoved={() => undefined}
    />
  );
}

function useMediaFile(
  projectId: string,
  mediaFileId: string,
): MediaFile | null {
  const { data } = useListMediaFilesQuery(projectId);
  return data?.media_files.find((file) => file.id === mediaFileId) ?? null;
}

/** The player's duration once it has loaded, else the probed duration, else zero, which requests no windows. */
function useDurationMs(projectId: string, mediaFile: MediaFile | null): number {
  const playerDurationMs = useAppSelector(selectPlayerDuration) * 1000;
  const { data } = useGetMediaTracksQuery(
    mediaFile?.source.kind === "path"
      ? { projectId, mediaFileId: mediaFile.id }
      : skipToken,
  );
  if (playerDurationMs > 0) return playerDurationMs;
  return data?.container.duration_ms ?? 0;
}

/** Loads peaks windows from the waveform route for a file on the server's disk. */
function useWaveformFetch(
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
