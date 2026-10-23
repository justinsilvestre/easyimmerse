import type { ServerLogEntry } from "@easyimmerse/types";

/** The time of a log record as the log list shows it, in the viewer's own clock time, to the second. */
export function formatLogTime(timeMs: number): string {
  return new Date(timeMs).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** The log as plain text for copying, one record per line, each with its time in UTC, its level and the module that wrote it. */
export function formatServerLog(entries: readonly ServerLogEntry[]): string {
  return entries
    .map(
      (entry) =>
        `${new Date(entry.time_ms).toISOString()} ${entry.level.toUpperCase()} ${entry.target}: ${entry.message}`,
    )
    .join("\n");
}
