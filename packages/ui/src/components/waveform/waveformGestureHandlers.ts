import type { WaveformDrag } from "./waveformDrag.ts";

/** What the strip reports back from pointer and wheel gestures. */
export type WaveformGestureHandlers = {
  onSeek: (timeMs: number) => void;
  onOpenFlashcardSegment: (segmentId: string) => void;
  onClipEndpointMoved: (
    segmentId: string,
    endpoint: "start" | "end",
    timeMs: number,
  ) => void;
  onScreenshotMarkerMoved: (segmentId: string, timeMs: number) => void;
  onVisibleSpanChange: (spanMs: number) => void;
};

/** Reports a finished drag through the handler for the kind of handle dragged. */
export function reportDragEnd(
  drag: WaveformDrag,
  handlers: WaveformGestureHandlers,
): void {
  const { segmentId, kind } = drag.hit;
  if (kind === "screenshot")
    handlers.onScreenshotMarkerMoved(segmentId, drag.timeMs);
  else
    handlers.onClipEndpointMoved(
      segmentId,
      kind === "clipStart" ? "start" : "end",
      drag.timeMs,
    );
}
