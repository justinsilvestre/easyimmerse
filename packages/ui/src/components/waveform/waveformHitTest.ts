import type { FlashcardSegment } from "./flashcardSegment.ts";
import type { WaveformView } from "./waveformGeometry.ts";
import { xAtTime } from "./waveformGeometry.ts";

/** What lies under a point of the strip. */
export type WaveformHit =
  | { kind: "clipStart" | "clipEnd" | "screenshot"; segmentId: string }
  | { kind: "segment"; segmentId: string }
  | { kind: "none" };

/** How far from a handle, in pixels, a pointer still grabs it. */
const handleGrabPx = 6;
/** The screenshot marker hangs from the top edge down to this height. */
export const screenshotMarkerHeightPx = 14;

/**
 * Finds the handle, else the segment, under the point. Handles win over segment bodies, and the nearest handle wins.
 * Only the segment `editableSegmentId`, the flashcard open in the editor, has handles to find; every other segment is found by its body alone.
 */
export function hitTest(
  view: WaveformView,
  segments: readonly FlashcardSegment[],
  point: { x: number; y: number },
  editableSegmentId: string | null,
): WaveformHit {
  const handles = segments
    .filter((segment) => segment.id === editableSegmentId)
    .flatMap((segment) => handlesOf(view, segment));
  const nearest = handles
    .filter(
      ({ x, topOnly }) =>
        Math.abs(x - point.x) <= handleGrabPx &&
        (!topOnly || point.y <= screenshotMarkerHeightPx),
    )
    .sort((a, b) => Math.abs(a.x - point.x) - Math.abs(b.x - point.x))[0];
  if (nearest) return nearest.hit;
  const body = segments.find(
    (segment) =>
      point.x >= xAtTime(view, segment.startMs) &&
      point.x <= xAtTime(view, segment.endMs),
  );
  return body ? { kind: "segment", segmentId: body.id } : { kind: "none" };
}

/** The cursor that tells what pressing at a hit would do: drag a handle sideways, open a segment with a double-click, or seek. */
export function cursorOf(hit: WaveformHit): string {
  if (hit.kind === "none") return "";
  return hit.kind === "segment" ? "pointer" : "ew-resize";
}

function handlesOf(view: WaveformView, segment: FlashcardSegment) {
  const segmentId = segment.id;
  return [
    {
      x: xAtTime(view, segment.screenshotMs),
      topOnly: true,
      hit: { kind: "screenshot", segmentId } as const,
    },
    {
      x: xAtTime(view, segment.startMs),
      topOnly: false,
      hit: { kind: "clipStart", segmentId } as const,
    },
    {
      x: xAtTime(view, segment.endMs),
      topOnly: false,
      hit: { kind: "clipEnd", segmentId } as const,
    },
  ];
}
