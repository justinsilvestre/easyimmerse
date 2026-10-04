import type { FlashcardSegment } from "./flashcardSegment.ts";
import type { WaveformView } from "./waveformGeometry.ts";
import { xAtTime } from "./waveformGeometry.ts";

/** What lies under a point of the strip. */
export type WaveformHit =
  | { kind: "clipStart" | "clipEnd" | "screenshot"; segmentId: string }
  | { kind: "segment"; segmentId: string }
  | { kind: "none" };

/** How far from a handle, in pixels, a pointer still grabs it. */
export const handleGrabPx = 6;
/** The screenshot marker hangs from the top edge down to this height. */
export const screenshotMarkerHeightPx = 14;

/** Finds the handle, else the segment, under the point. Handles win over segment bodies, and the nearest handle wins. */
export function hitTest(
  view: WaveformView,
  segments: readonly FlashcardSegment[],
  point: { x: number; y: number },
): WaveformHit {
  const handles = segments.flatMap((segment) => handlesOf(view, segment));
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
