import type { FooterActivity } from "@easyimmerse/state";
import clsx from "clsx";
import { CircleAlert } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { FooterActivitiesList } from "./FooterActivitiesList.tsx";
import {
  meanPercentOf,
  summarizeFooterActivities,
} from "./footerActivitiesSummary.ts";
import { focusInitialMenuItem, moveMenuFocusForKey } from "./menuFocus.ts";
import { ProgressBar } from "./ProgressBar.tsx";

/**
 * One compact button standing for several activities, which opens a menu listing them above the footer.
 * While all run, it shows one bar at their mean percentage and counts them; once one fails,
 * it takes the danger colors and leads with the failures.
 * The menu's keys and closing follow `MenuButton`: the arrows move between the rows, and Escape,
 * a choice, a move of the focus outside, or a press outside closes it.
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
  const [isOpen, setOpen] = useState(false);
  const menuId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const hasFailure = activities.some((a) => a.status === "failed");
  const summary = summarizeFooterActivities(activities);
  const closeAndFocusButton = () => {
    setOpen(false);
    ref.current?.querySelector<HTMLElement>("[aria-haspopup]")?.focus();
  };
  useEffect(() => {
    if (isOpen && menuRef.current) focusInitialMenuItem(menuRef.current);
  }, [isOpen]);
  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node | null)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePress);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsidePress);
  }, [isOpen]);
  return (
    // The handlers only close the menu; the button and the rows inside are the interactive elements.
    // biome-ignore lint/a11y/noStaticElementInteractions: see above
    <div
      ref={ref}
      className={clsx("relative min-w-0", className)}
      onBlur={(event) => {
        const next = event.relatedTarget as Node | null;
        if (next !== null && !ref.current?.contains(next)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") closeAndFocusButton();
        else if (
          menuRef.current &&
          moveMenuFocusForKey(menuRef.current, event.key)
        )
          event.preventDefault();
      }}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        title="Show the tasks"
        className={clsx(
          "flex min-w-0 max-w-full items-center gap-2 rounded-md px-2 py-1 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          hasFailure
            ? "bg-danger-soft text-danger-fg hover:bg-danger-line"
            : "text-fg-muted hover:bg-surface-muted hover:text-fg",
        )}
        onClick={() => setOpen(!isOpen)}
      >
        {hasFailure ? (
          <CircleAlert aria-hidden className="size-3.5 shrink-0" />
        ) : (
          <span aria-hidden className="w-12 shrink-0">
            <ProgressBar label={summary} percent={meanPercentOf(activities)} />
          </span>
        )}
        <span className="truncate">{summary}</span>
      </button>
      {isOpen && (
        <FooterActivitiesList
          ref={menuRef}
          id={menuId}
          aria-label="Tasks"
          activities={activities}
          onOpen={(activity) => {
            closeAndFocusButton();
            onOpen(activity);
          }}
          // Keeps the focus on the focused row while it is pressed, so that the keys keep working.
          onMouseDown={(event) => event.preventDefault()}
          className="absolute bottom-full left-0 z-20 mb-1"
        />
      )}
    </div>
  );
}
