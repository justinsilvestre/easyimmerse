import clsx from "clsx";
import { CircleAlert } from "lucide-react";
import type { FooterActivity } from "./FooterActivity.ts";
import { ProgressBar } from "./ProgressBar.tsx";

/** A compact button for the footer that tells of one activity under way or failed, and opens its place in the app. */
export function FooterActivityButton({
  activity,
  onOpen,
}: {
  activity: FooterActivity;
  onOpen: (activity: FooterActivity) => void;
}) {
  const isRunning = activity.status === "running";
  return (
    <button
      type="button"
      title={activity.openLabel}
      className={clsx(
        "flex min-w-0 items-center gap-2 rounded-md px-2 py-1 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        isRunning
          ? "text-fg-muted hover:bg-surface-muted hover:text-fg"
          : "bg-danger-soft text-danger-fg hover:bg-danger-line",
      )}
      onClick={() => onOpen(activity)}
    >
      <FooterActivityMark activity={activity} />
      <span className="truncate">{activity.label}</span>
      {activity.status === "running" && activity.percent !== null && (
        <span className="shrink-0 tabular-nums">{activity.percent}%</span>
      )}
    </button>
  );
}

/**
 * The small bar of a running activity, or the alert sign of a failed one.
 * Both are hidden from screen readers, since the label beside them says the same and keeps the button's name short.
 */
export function FooterActivityMark({ activity }: { activity: FooterActivity }) {
  if (activity.status === "failed")
    return <CircleAlert aria-hidden className="size-3.5 shrink-0" />;
  return (
    <span aria-hidden className="w-12 shrink-0">
      <ProgressBar label={activity.label} percent={activity.percent} />
    </span>
  );
}
