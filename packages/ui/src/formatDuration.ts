/** Formats a length in milliseconds as "m:ss", or as "h:mm:ss" from one hour on. */
export function formatDuration(durationMs: number): string {
  const totalSeconds = Math.floor(durationMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const seconds = padToTwoDigits(totalSeconds % 60);
  if (hours === 0) return `${minutes}:${seconds}`;
  return `${hours}:${padToTwoDigits(minutes)}:${seconds}`;
}

function padToTwoDigits(value: number): string {
  return String(value).padStart(2, "0");
}
