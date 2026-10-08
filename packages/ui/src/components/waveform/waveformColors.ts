/**
 * The colors of what the strip draws over its bars, fixed in both themes because the media screen is dark in both.
 * The values are Tailwind's gray, blue, and amber palette colors, written out because the canvas cannot read CSS tokens.
 */
export const waveformColors = {
  cueFill: "rgba(96, 165, 250, 0.35)",
  cueEdge: "#60a5fa",
  segmentFill: "rgba(251, 191, 36, 0.18)",
  segmentEdge: "#fbbf24",
  screenshotMarker: "#fde68a",
  playhead: "#ffffff",
} as const;
