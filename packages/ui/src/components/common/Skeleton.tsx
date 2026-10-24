import clsx from "clsx";
import type { ReactNode } from "react";

/**
 * A placeholder block in the shape of content that is still loading. `className` sets its size and shape.
 * It pulses gently, and holds still when the person prefers reduced motion. Assistive technology skips it.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={clsx(
        "animate-pulse rounded-md bg-surface-strong motion-reduce:animate-none",
        className,
      )}
    />
  );
}

/**
 * Tells assistive technology that something is loading, and shows the skeletons given as children.
 * The skeletons fade in only after a moment, so a load that finishes quickly does not flash placeholders.
 */
export function LoadingStatus({
  label,
  className,
  children,
}: {
  /** What is loading, such as "Loading projects". It is read out, followed by an ellipsis. */
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      className={clsx(
        "transition-opacity delay-300 duration-200 starting:opacity-0",
        className,
      )}
    >
      <span className="sr-only">{label}…</span>
      {children}
    </div>
  );
}
