import type { FooterActivity } from "@easyimmerse/state";
import clsx from "clsx";
import { CircleAlert } from "lucide-react";
import { FooterActivitiesList } from "./FooterActivitiesList.tsx";
import {
  meanPercentOf,
  summarizeFooterActivities,
} from "./footerActivitiesSummary.ts";
import { MenuShell } from "./MenuShell.tsx";
import { ProgressBar } from "./ProgressBar.tsx";

/**
 * One compact button standing for several activities, which opens a menu listing them above the footer.
 * While all run, it shows one bar at their mean percentage and counts them; once one fails,
 * it takes the danger colors and leads with the failures.
 * The menu's keys and closing are those of `MenuShell`.
 */
export function FooterActivitiesMenu({
  activities,
  onOpen,
  className,
}: {
  activities: readonly FooterActivity[];
  onOpen: (activity: FooterActivity) => void;
  className?: string;
}) {
  const hasFailure = activities.some((a) => a.status === "failed");
  const summary = summarizeFooterActivities(activities);
  return (
    <MenuShell
      className={clsx("min-w-0", className)}
      trigger={(triggerProps) => (
        <button
          type="button"
          title="Show the tasks"
          className={clsx(
            "flex min-w-0 max-w-full items-center gap-2 rounded-md px-2 py-1 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            hasFailure
              ? "bg-danger-soft text-danger-fg hover:bg-danger-line"
              : "text-fg-muted hover:bg-surface-muted hover:text-fg",
          )}
          {...triggerProps}
        >
          {hasFailure ? (
            <CircleAlert aria-hidden className="size-3.5 shrink-0" />
          ) : (
            <span aria-hidden className="w-12 shrink-0">
              <ProgressBar
                label={summary}
                percent={meanPercentOf(activities)}
              />
            </span>
          )}
          <span className="truncate">{summary}</span>
        </button>
      )}
      menu={({ close, ...menuProps }) => (
        <FooterActivitiesList
          {...menuProps}
          aria-label="Tasks"
          activities={activities}
          onOpen={(activity) => {
            close();
            onOpen(activity);
          }}
          className="absolute bottom-full left-0 z-20 mb-1"
        />
      )}
    />
  );
}
