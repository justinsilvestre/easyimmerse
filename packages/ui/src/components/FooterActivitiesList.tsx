import clsx from "clsx";
import type { ComponentProps } from "react";
import type { FooterActivity } from "./FooterActivity.ts";
import { FooterActivityMark } from "./FooterActivityButton.tsx";

/**
 * The activities as the rows of a menu, each with its bar or alert sign, its label and its percentage, and each opening its place in the app.
 * The menu button that shows it handles the keys; this is only the list.
 */
export function FooterActivitiesList({
  activities,
  onOpen,
  className,
  ...rest
}: ComponentProps<"div"> & {
  activities: readonly FooterActivity[];
  onOpen: (activity: FooterActivity) => void;
}) {
  return (
    <div
      role="menu"
      className={clsx(
        "flex w-72 max-w-[calc(100vw-1rem)] flex-col rounded-md border border-line bg-surface py-1 text-sm shadow-lg",
        className,
      )}
      {...rest}
    >
      {activities.map((activity) => (
        <div key={activity.id} role="none">
          <FooterActivityRow activity={activity} onOpen={onOpen} />
        </div>
      ))}
    </div>
  );
}

function FooterActivityRow({
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
      role="menuitem"
      title={activity.openLabel}
      className={clsx(
        "flex w-full items-center gap-2 px-3 py-1.5 text-left focus-visible:outline-none",
        isRunning
          ? "text-fg hover:bg-surface-muted focus-visible:bg-surface-muted"
          : "text-danger-fg hover:bg-danger-soft focus-visible:bg-danger-soft",
      )}
      onClick={() => onOpen(activity)}
    >
      <FooterActivityMark activity={activity} />
      <span className="min-w-0 flex-1 truncate">{activity.label}</span>
      {isRunning && activity.percent !== null && (
        <span className="shrink-0 text-xs text-fg-muted tabular-nums">
          {activity.percent}%
        </span>
      )}
    </button>
  );
}
