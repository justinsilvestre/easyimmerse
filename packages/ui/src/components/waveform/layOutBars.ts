/** The narrowest spacing between the left edges of neighbouring bars, in CSS pixels. */
export const minBarPitchPx = 4;
/** The share of each bar's spacing that the bar fills, the rest being the gap to the next bar. */
const barFill = 0.7;
/** Absorbs rounding error, so that peaks lying exactly `minBarPitchPx` apart still get a bar each. */
const tolerance = 1e-6;

/** A bar's left edge and width in CSS pixels, and its loudness from 0 to 1, or null where no peak is loaded. */
export type Bar = { x: number; width: number; peak: number | null };

/**
 * The part of the peaks a waveform shows and the canvas it is drawn on.
 * `from` and `to` are the positions at the left and right edges, counted in peaks from the first.
 */
export type BarFrame = {
  from: number;
  to: number;
  widthPx: number;
  pixelRatio: number;
};

/** How many neighbouring peaks each bar takes the loudest of, so that the bars lie at least `minBarPitchPx` apart. */
export function peaksPerBar(pxPerPeak: number): number {
  return Math.max(1, Math.ceil(minBarPitchPx / pxPerPeak - tolerance));
}

/**
 * Lays out evenly spaced bars over the part of the peaks on view, with their edges on the device's pixels.
 * Groups of peaks start at the first peak, so a group keeps its peaks as the view moves.
 */
export function layOutBars(
  peaks: readonly (number | null)[],
  frame: BarFrame,
): Bar[] {
  const pxPerPeak = frame.widthPx / (frame.to - frame.from);
  const perBar = peaksPerBar(pxPerPeak);
  const first = Math.max(0, Math.floor(frame.from / perBar));
  const last = Math.min(
    Math.ceil(peaks.length / perBar),
    Math.ceil(frame.to / perBar),
  );
  const snap = (px: number) =>
    Math.round(px * frame.pixelRatio) / frame.pixelRatio;
  const bars: Bar[] = [];
  for (let group = first; group < last; group += 1) {
    const left = (group * perBar - frame.from) * pxPerPeak;
    const x = snap(left);
    const right = snap(left + perBar * pxPerPeak * barFill);
    bars.push({
      x,
      width: Math.max(right - x, 1 / frame.pixelRatio),
      peak: loudest(peaks, group * perBar, (group + 1) * perBar),
    });
  }
  return bars;
}

/** The loudest of the peaks from one index up to another, or null when none of them is loaded. */
function loudest(
  peaks: readonly (number | null)[],
  from: number,
  to: number,
): number | null {
  let result: number | null = null;
  for (let index = from; index < Math.min(to, peaks.length); index += 1) {
    const peak = peaks[index] ?? null;
    if (peak !== null) result = Math.max(result ?? 0, peak);
  }
  return result;
}
