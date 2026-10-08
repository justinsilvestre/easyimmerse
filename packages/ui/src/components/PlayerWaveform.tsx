import { actions, selectCurrentTime } from "@easyimmerse/state";
import type { Cue } from "@easyimmerse/types";
import { useState } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { useMediaDurationMs } from "../player/useMediaDurationMs.ts";
import { useMediaFile } from "../player/useMediaFile.ts";
import type { FlashcardSegment } from "./waveform/flashcardSegment.ts";
import { useWaveformFetch } from "./waveform/useWaveformFetch.ts";
import { useWaveformWindows } from "./waveform/useWaveformWindows.ts";
import { WaveformStrip } from "./waveform/WaveformStrip.tsx";
import {
  clampVisibleSpan,
  computeViewStart,
} from "./waveform/waveformGeometry.ts";

const initialVisibleSpanMs = 60_000;

type FlashcardSegmentHandlers = {
  onOpenFlashcardSegment: (segmentId: string) => void;
  onClipEndpointMoved: (
    segmentId: string,
    endpoint: "start" | "end",
    timeMs: number,
  ) => void;
  onScreenshotMarkerMoved: (segmentId: string, timeMs: number) => void;
};

const ignoreSegments: FlashcardSegmentHandlers = {
  onOpenFlashcardSegment: () => undefined,
  onClipEndpointMoved: () => undefined,
  onScreenshotMarkerMoved: () => undefined,
};

/**
 * The waveform strip under the player for the open media file, following the store's current time,
 * with the cues and the flashcard segments drawn over it. Any segment opens on a double-click; only the open one's handles drag.
 */
export function PlayerWaveform({
  projectId,
  mediaFileId,
  cues = [],
  flashcardSegments = [],
  editableSegmentId = null,
  segmentHandlers = ignoreSegments,
}: {
  projectId: string;
  mediaFileId: string;
  cues?: readonly Cue[];
  flashcardSegments?: readonly FlashcardSegment[];
  /** The segment of the flashcard open in the editor, the only one whose clip and screenshot time can be dragged. */
  editableSegmentId?: string | null;
  segmentHandlers?: FlashcardSegmentHandlers;
}) {
  const dispatch = useAppDispatch();
  const mediaFile = useMediaFile(projectId, mediaFileId);
  const currentTimeMs = useAppSelector(selectCurrentTime) * 1000;
  const durationMs = useMediaDurationMs(projectId, mediaFile);
  const fetchWindow = useWaveformFetch(projectId, mediaFile);
  const [requestedSpanMs, setRequestedSpanMs] = useState(initialVisibleSpanMs);
  const visibleSpanMs = clampVisibleSpan(requestedSpanMs, durationMs);
  const viewStartMs = computeViewStart(
    currentTimeMs,
    visibleSpanMs,
    durationMs,
  );
  const windows = useWaveformWindows(fetchWindow, {
    viewStartMs,
    viewEndMs: viewStartMs + visibleSpanMs,
    focusMs: currentTimeMs,
    durationMs,
  });
  return (
    <div className="border-t border-line bg-surface px-3 py-2">
      <WaveformStrip
        durationMs={durationMs}
        currentTimeMs={currentTimeMs}
        windows={windows}
        cues={cues}
        flashcardSegments={flashcardSegments}
        editableSegmentId={editableSegmentId}
        visibleSpanMs={visibleSpanMs}
        onVisibleSpanChange={setRequestedSpanMs}
        onSeek={(timeMs) => dispatch(actions.seekRequested(timeMs / 1000))}
        {...segmentHandlers}
      />
    </div>
  );
}
