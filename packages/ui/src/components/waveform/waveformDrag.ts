import type { FlashcardSegment } from "./flashcardSegment.ts";
import type { WaveformHit } from "./waveformHitTest.ts";

/** A handle being dragged, with where it is at the moment. */
export type WaveformDrag = {
  hit: Extract<WaveformHit, { kind: "clipStart" | "clipEnd" | "screenshot" }>;
  timeMs: number;
};

/** The shortest clip a drag may leave. */
const minClipMs = 100;

/** Moves the dragged handle to the time, keeping the clip in order and the screenshot inside it. */
export function constrainDrag(
  drag: WaveformDrag,
  segments: readonly FlashcardSegment[],
  durationMs: number,
): WaveformDrag {
  const segment = segments.find((s) => s.id === drag.hit.segmentId);
  if (segment === undefined) return drag;
  const [low, high] = dragBounds(drag.hit.kind, segment, durationMs);
  return { ...drag, timeMs: Math.min(Math.max(drag.timeMs, low), high) };
}

function dragBounds(
  kind: WaveformDrag["hit"]["kind"],
  segment: FlashcardSegment,
  durationMs: number,
): [number, number] {
  switch (kind) {
    case "clipStart":
      return [0, segment.endMs - minClipMs];
    case "clipEnd":
      return [segment.startMs + minClipMs, durationMs];
    case "screenshot":
      return [segment.startMs, segment.endMs];
  }
}

/** The segments as they would be if the drag ended now, for drawing. */
export function applyDrag(
  segments: readonly FlashcardSegment[],
  drag: WaveformDrag | null,
): readonly FlashcardSegment[] {
  if (drag === null) return segments;
  return segments.map((segment) =>
    segment.id === drag.hit.segmentId
      ? { ...segment, [draggedField(drag.hit.kind)]: drag.timeMs }
      : segment,
  );
}

function draggedField(
  kind: WaveformDrag["hit"]["kind"],
): keyof FlashcardSegment {
  switch (kind) {
    case "clipStart":
      return "startMs";
    case "clipEnd":
      return "endMs";
    case "screenshot":
      return "screenshotMs";
  }
}
