import clsx from "clsx";

/** A bar filled to `percent`, or sliding back and forth while how much is done is unknown. */
export function ProgressBar({
  label,
  percent,
  className,
}: {
  label: string;
  /** How much is done, from 0 to 100, or null while it is unknown. */
  percent: number | null;
  className?: string;
}) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent ?? undefined}
      className={clsx(
        "h-1.5 overflow-hidden rounded-full bg-surface-strong",
        className,
      )}
    >
      {percent === null ? (
        <div className="h-full w-1/3 animate-progress-slide rounded-full bg-accent" />
      ) : (
        <div
          className="h-full rounded-full bg-accent transition-[width]"
          style={{ width: `${percent}%` }}
        />
      )}
    </div>
  );
}
