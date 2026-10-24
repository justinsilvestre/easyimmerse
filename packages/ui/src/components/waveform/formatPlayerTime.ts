/** Formats seconds as `m:ss.s`, for example 61.75 becomes `1:01.8`. Rounding happens before the minutes are split off, so 59.96 becomes `1:00.0`. */
export function formatPlayerTime(seconds: number): string {
  const tenths = Math.round(seconds * 10);
  const minutes = Math.floor(tenths / 600);
  const rest = ((tenths % 600) / 10).toFixed(1).padStart(4, "0");
  return `${minutes}:${rest}`;
}
