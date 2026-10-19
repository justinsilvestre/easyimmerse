import { FooterActivitiesMenu } from "./FooterActivitiesMenu.tsx";
import type { FooterActivity } from "./FooterActivity.ts";
import { FooterActivityButton } from "./FooterActivityButton.tsx";
import { describeFooterActivities } from "./footerActivitiesSummary.ts";

/**
 * The activities under way or failed, at the footer's left edge after the fixed controls.
 * One activity is a button of its own. Two stand side by side where the footer leaves them 28rem,
 * and fold into one summary button with a menu where it leaves less, as on a phone beside the media screen's toggles;
 * three or more always fold.
 * The folding is a container query on this element, so it must be given its share of the footer's width.
 * A screen reader hears each activity's label when it appears and when it fails, but not its changing percentage.
 */
export function FooterActivities({
  activities,
  onOpen,
}: {
  activities: readonly FooterActivity[];
  onOpen: (activity: FooterActivity) => void;
}) {
  return (
    <div className="@container flex min-w-0 flex-1 items-center">
      <span role="status" className="sr-only">
        {describeFooterActivities(activities)}
      </span>
      {activities.length <= 2 && (
        <div
          className={
            activities.length === 2
              ? "hidden min-w-0 items-center gap-2 @md:flex"
              : "flex min-w-0 items-center gap-2"
          }
        >
          {activities.map((activity) => (
            <FooterActivityButton
              key={activity.id}
              activity={activity}
              onOpen={onOpen}
            />
          ))}
        </div>
      )}
      {activities.length >= 2 && (
        <FooterActivitiesMenu
          activities={activities}
          onOpen={onOpen}
          className={activities.length === 2 ? "@md:hidden" : undefined}
        />
      )}
    </div>
  );
}
