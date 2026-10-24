import type { FooterActivity } from "@easyimmerse/state";
import clsx from "clsx";
import type { ComponentProps } from "react";
import { FooterActivityMark } from "./FooterActivityButton.tsx";

/**
 * The activities as the rows of a menu, each with its bar or alert sign, its label and its percentage, and each opening its place in the app.
 * A row of an activity with no place is disabled.
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
  const { opens } = activity;
  return (
    <button
      type="button"
      role="menuitem"
      title={opens?.label}
      aria-disabled={opens === null || undefined}
      className={clsx(
        "flex w-full items-center gap-2 px-3 py-1.5 text-left focus-visible:outline-none",
        isRunning
          ? "text-fg focus-visible:bg-surface-muted"
          : "text-danger-fg focus-visible:bg-danger-soft",
        opens !== null &&
          (isRunning ? "hover:bg-surface-muted" : "hover:bg-danger-soft"),
      )}
      onClick={opens === null ? undefined : () => onOpen(activity)}
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
