/** Writes a playback speed as a short multiplier such as "1×" or "0.75×", rounded to two decimals. */
export function formatSpeed(speed: number): string {
  return `${Number(speed.toFixed(2))}×`;
}
