import type { ImportProgress } from "@easyimmerse/types";
import { ProgressBar } from "../../components/common/ProgressBar.tsx";

/**
 * Shows that a file is being added, with how much of it has been read when its format can tell, and how many entries the import has stored so far.
 * The bar is indeterminate until the share read is known.
 */
export function DictionaryImportProgress({
  fileName,
  progress,
}: {
  fileName: string;
  /** What the import has stored so far, or null before the server reports it. */
  progress: ImportProgress | null;
}) {
  const label = `Adding ${fileName}…`;
  const percent = progress?.percent ?? null;
  return (
    <div
      role="status"
      className="flex flex-col gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm"
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-medium">{label}</p>
        {percent !== null && (
          <p className="text-fg-muted tabular-nums">{percent}%</p>
        )}
      </div>
      <ProgressBar label={label} percent={percent} />
      {progress && (
        <p className="text-fg-muted">{describeProgress(progress)}</p>
      )}
    </div>
  );
}

/** Names the entries stored so far, formatted for the user's locale, as in "12,345 entries so far". */
function describeProgress(progress: ImportProgress): string {
  const noun = progress.entries === 1 ? "entry" : "entries";
  return `${progress.entries.toLocaleString()} ${noun} so far`;
}
