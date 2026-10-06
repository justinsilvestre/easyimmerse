import type { MediaSourceJob, MediaSourceLogLine } from "@easyimmerse/types";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { Button } from "../components/Button.tsx";
import { ModalDialog } from "../components/ModalDialog.tsx";
import { SelectField } from "../components/SelectField.tsx";
import { TextField } from "../components/TextField.tsx";

/** An installed media-source plugin, as the dialog offers it. */
export type MediaSourceOption = { name: string };

/**
 * Asks for a URL or an id that one of the installed media-source plugins understands,
 * and fetches the media through that plugin. Fetching lasts a while, so the dialog stays
 * open with the fields locked, showing the fetch's progress and what the plugin reports,
 * until the caller reports the outcome. A failed fetch leaves its log open to read.
 */
export function AddMediaFromUrlDialog({
  sources,
  isStarting,
  job,
  error,
  onAdd,
  onCancel,
}: {
  sources: readonly MediaSourceOption[];
  /** Whether the fetch is being started, before there is a job to watch. */
  isStarting: boolean;
  /** The fetch being watched, or null before one starts. */
  job: MediaSourceJob | null;
  /** Why the fetch could not be started, or null. */
  error: string | null;
  onAdd: (source: string, locator: string) => void;
  onCancel: () => void;
}) {
  const [source, setSource] = useState(sources[0]?.name ?? "");
  const [locator, setLocator] = useState("");
  const isRunning = isStarting || job?.status === "running";
  const canAdd = locator.trim() !== "" && source !== "" && !isRunning;
  const failure =
    error ??
    (job?.status === "failed"
      ? (job.error?.message ?? "The media could not be added.")
      : null);
  const add = () => {
    if (canAdd) onAdd(source, locator.trim());
  };
  return (
    <ModalDialog
      title="Add media from a URL"
      description="The media and its subtitles are fetched through an installed plugin."
      onCancel={onCancel}
      footer={
        <>
          <Button onClick={onCancel}>{isRunning ? "Close" : "Cancel"}</Button>
          <Button variant="primary" aria-disabled={!canAdd} onClick={add}>
            {isRunning ? "Adding…" : "Add"}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          add();
        }}
      >
        {sources.length > 1 && (
          <SelectField
            label="Source"
            options={sources.map(({ name }) => ({ value: name, label: name }))}
            value={source}
            disabled={isRunning}
            onChange={(event) => setSource(event.target.value)}
          />
        )}
        <TextField
          label="URL or ID"
          placeholder="https://"
          value={locator}
          disabled={isRunning}
          onChange={(event) => setLocator(event.target.value)}
        />
        {job && <FetchProgress job={job} />}
        {failure !== null && (
          <p className="text-sm text-danger-fg" role="alert">
            {failure}
          </p>
        )}
      </form>
    </ModalDialog>
  );
}

/** The fetch's progress bar, its latest step, and the log of what the plugin reported. */
function FetchProgress({ job }: { job: MediaSourceJob }) {
  const fraction = job.progress?.fraction ?? null;
  const message =
    job.status === "running"
      ? (job.progress?.message ?? "Starting the fetch")
      : job.status === "done"
        ? "Done"
        : "Failed";
  return (
    <div className="flex flex-col gap-2">
      <ProgressBar fraction={job.status === "done" ? 1 : fraction} />
      <p className="text-sm text-fg-muted" role="status">
        {message}
        {job.status === "running" && ". This can take a few minutes."}
      </p>
      <details open={job.status === "failed"} className="text-xs">
        <summary className="cursor-pointer text-fg-muted">Log</summary>
        <FetchLog lines={job.log} />
      </details>
    </div>
  );
}

/** A bar filled to `fraction`, or pulsing while the fraction is still unknown. */
function ProgressBar({ fraction }: { fraction: number | null }) {
  const percent = fraction === null ? null : Math.round(fraction * 100);
  return (
    <div
      role="progressbar"
      aria-label="Fetch progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent ?? undefined}
      className="h-1.5 w-full overflow-hidden rounded bg-surface-muted"
    >
      <div
        className={clsx(
          "h-full bg-accent transition-[width]",
          percent === null && "animate-pulse",
        )}
        style={{ width: `${percent ?? 100}%` }}
      />
    </div>
  );
}

/** The log lines, newest at the bottom, kept scrolled to the latest while they arrive. */
function FetchLog({ lines }: { lines: readonly MediaSourceLogLine[] }) {
  const listRef = useRef<HTMLOListElement>(null);
  const count = lines.length;
  useEffect(() => {
    const list = listRef.current;
    if (list && count > 0) list.scrollTop = list.scrollHeight;
  }, [count]);
  return (
    <ol
      ref={listRef}
      aria-label="Log"
      className="mt-1 max-h-40 overflow-y-auto rounded border border-line bg-surface-muted p-2 font-mono whitespace-pre-wrap"
    >
      {withKeys(lines).map(({ line, key }) => (
        <li
          key={key}
          className={clsx(
            line.level === "output" && "text-fg-muted",
            line.level === "warn" && "text-warning-fg",
            line.level === "error" && "text-danger-fg",
          )}
        >
          {line.message}
        </li>
      ))}
    </ol>
  );
}

/**
 * Keys each line by its time and text, counting repeats apart, since a download reports
 * the same progress line more than once within a millisecond.
 */
function withKeys(lines: readonly MediaSourceLogLine[]) {
  const seen = new Map<string, number>();
  return lines.map((line) => {
    const text = `${line.at_ms} ${line.level} ${line.message}`;
    const repeats = seen.get(text) ?? 0;
    seen.set(text, repeats + 1);
    return { line, key: `${text} #${repeats}` };
  });
}
