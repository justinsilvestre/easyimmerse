import type { DictionaryImportStatus } from "@easyimmerse/state";
import clsx from "clsx";
import { ProgressBar } from "../components/ProgressBar.tsx";

/** A compact button for the footer that tells of a dictionary import under way or failed, and opens the dictionaries page. */
export function DictionaryImportStatusButton({
  status,
  onOpen,
}: {
  status: DictionaryImportStatus;
  onOpen: () => void;
}) {
  const isRunning = status.kind === "running";
  return (
    <button
      type="button"
      title="Show on the dictionaries page"
      className={clsx(
        "flex min-w-0 items-center gap-2 rounded-md px-2 py-1 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        isRunning
          ? "text-fg-muted hover:bg-surface-muted hover:text-fg"
          : "bg-danger-soft text-danger-fg hover:bg-danger-line",
      )}
      onClick={onOpen}
    >
      {isRunning ? (
        <>
          {/* The text beside it says the same, so the bar is hidden from screen readers to keep the button's name short. */}
          <span aria-hidden className="w-12 shrink-0">
            <ProgressBar
              label={`Adding ${status.fileName}`}
              percent={status.percent}
            />
          </span>
          <span className="truncate">Adding {status.fileName}</span>
          {status.percent !== null && (
            <span className="shrink-0 tabular-nums">{status.percent}%</span>
          )}
        </>
      ) : (
        <span className="truncate">A dictionary could not be added</span>
      )}
    </button>
  );
}
