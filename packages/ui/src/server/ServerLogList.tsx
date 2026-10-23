import type { DesktopServerLogsView } from "@easyimmerse/state";
import type { ServerLogEntry } from "@easyimmerse/types";
import { Badge } from "../components/Badge.tsx";
import { Button } from "../components/Button.tsx";
import { formatLogTime } from "./formatServerLog.ts";

/** The server's recent log records, newest last, with buttons that read the log again and copy it. */
export function ServerLogList({
  logs,
  onRefresh,
  onCopy,
}: {
  logs: DesktopServerLogsView;
  onRefresh: () => void;
  onCopy: () => void;
}) {
  const hasEntries = (logs.entries?.length ?? 0) > 0;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="flex-1 text-sm font-semibold">Log</h3>
        <Button size="sm" onClick={onRefresh}>
          Refresh
        </Button>
        <Button
          size="sm"
          aria-disabled={!hasEntries}
          onClick={hasEntries ? onCopy : undefined}
        >
          Copy
        </Button>
      </div>
      <LogBody logs={logs} />
    </div>
  );
}

function LogBody({ logs }: { logs: DesktopServerLogsView }) {
  if (logs.failure !== null)
    return (
      <p role="alert" className="text-sm text-danger-fg">
        The log could not be read: {logs.failure}
      </p>
    );
  if (logs.entries === null)
    return <p className="text-sm text-fg-muted">Reading the log…</p>;
  if (logs.entries.length === 0)
    return <p className="text-sm text-fg-muted">The log is empty.</p>;
  return (
    <ol
      aria-label="Server log"
      className="flex max-h-72 flex-col gap-1 overflow-y-auto rounded border border-line bg-surface-muted p-2 font-mono text-xs"
    >
      {logs.entries.map((entry, index) => (
        // Records carry no id, and the list only ever grows at its end between reads.
        // biome-ignore lint/suspicious/noArrayIndexKey: see above.
        <LogLine key={index} entry={entry} />
      ))}
    </ol>
  );
}

function LogLine({ entry }: { entry: ServerLogEntry }) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-2">
      <time
        dateTime={new Date(entry.time_ms).toISOString()}
        className="text-fg-muted"
      >
        {formatLogTime(entry.time_ms)}
      </time>
      {entry.level === "warn" && <Badge tone="warning">Warning</Badge>}
      {entry.level === "error" && <Badge tone="danger">Error</Badge>}
      <span className="text-fg-muted">{entry.target}</span>
      <span className="break-all whitespace-pre-wrap">{entry.message}</span>
    </li>
  );
}
