import type { ImportProgress } from "@easyimmerse/types";

/**
 * Shows that a file is being added, with an indeterminate bar, since a dictionary's size is not known
 * until it has been read, and how many entries the import has stored so far.
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
  return (
    <div
      role="status"
      className="flex flex-col gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm"
    >
      <p className="font-medium">{label}</p>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-1.5 overflow-hidden rounded-full bg-surface-strong"
      >
        <div className="h-full w-1/3 animate-progress-slide rounded-full bg-accent" />
      </div>
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
