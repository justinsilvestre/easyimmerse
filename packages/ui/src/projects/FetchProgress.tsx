import type { MediaSourceJob } from "@easyimmerse/types";
import clsx from "clsx";
import { FetchLog } from "./FetchLog.tsx";

/** The fetch's progress bar, its latest step, and the log of what the plugin reported, open once the fetch fails. */
export function FetchProgress({ job }: { job: MediaSourceJob }) {
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
