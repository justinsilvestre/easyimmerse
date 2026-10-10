import { actions } from "@easyimmerse/state";
import type { Cue } from "@easyimmerse/types";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import type { FlashcardSegment } from "./waveform/flashcardSegment.ts";
import { selectPlayerWaveformView } from "./waveform/selectPlayerWaveformView.ts";
import { useWaveformWindows } from "./waveform/useWaveformWindows.ts";
import { WaveformStrip } from "./waveform/WaveformStrip.tsx";

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
  cues = [],
  flashcardSegments = [],
  editableSegmentId = null,
  segmentHandlers = ignoreSegments,
}: {
  cues?: readonly Cue[];
  flashcardSegments?: readonly FlashcardSegment[];
  /** The segment of the flashcard open in the editor, the only one whose clip and screenshot time can be dragged. */
  editableSegmentId?: string | null;
  segmentHandlers?: FlashcardSegmentHandlers;
}) {
  const dispatch = useAppDispatch();
  const view = useAppSelector(selectPlayerWaveformView);
  const windows = useWaveformWindows("player");
  return (
    <div className="border-t border-line bg-surface px-3 py-2">
      <WaveformStrip
        durationMs={view.durationMs}
        currentTimeMs={view.currentTimeMs}
        windows={windows}
        cues={cues}
        flashcardSegments={flashcardSegments}
        editableSegmentId={editableSegmentId}
        visibleSpanMs={view.visibleSpanMs}
        onVisibleSpanChange={(spanMs) =>
          dispatch(actions.waveformZoomed(spanMs))
        }
        onSeek={(timeMs) => dispatch(actions.seekRequested(timeMs / 1000))}
        {...segmentHandlers}
      />
    </div>
  );
}
