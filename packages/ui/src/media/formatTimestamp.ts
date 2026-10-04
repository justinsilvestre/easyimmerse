/** Formats a position in a media file as `m:ss`, or `h:mm:ss` from one hour on. */
export function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  const minuteSeconds = `${hours > 0 ? pad(minutes) : minutes}:${pad(seconds)}`;
  return hours > 0 ? `${hours}:${minuteSeconds}` : minuteSeconds;
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}
