/** The sizes the app's text can be drawn at, as percentages of the browser's default. */
export const textScales: readonly number[] = [
  75, 87.5, 100, 112.5, 125, 150, 175,
];

export const defaultTextScale = 100;

/** Reads a stored text scale, falling back to the default for anything unknown. */
export function parseTextScale(value: string | undefined): number {
  const scale = Number(value);
  return textScales.includes(scale) ? scale : defaultTextScale;
}

/** The next larger scale, or the same one at the top of the range. */
export function largerTextScale(scale: number): number {
  return textScales.find((candidate) => candidate > scale) ?? scale;
}

/** The next smaller scale, or the same one at the bottom of the range. */
export function smallerTextScale(scale: number): number {
  return textScales.findLast((candidate) => candidate < scale) ?? scale;
}
