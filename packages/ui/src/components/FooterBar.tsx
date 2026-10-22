import type { FooterActivity } from "@easyimmerse/state";
import { Settings } from "lucide-react";
import type { ReactNode } from "react";
import { FooterActivities } from "./FooterActivities.tsx";
import { IconButton } from "./IconButton.tsx";
import { ThemeMenu } from "./ThemeMenu.tsx";

/**
 * The thin bar at the bottom of the window, given its state as props: the way to Settings, the theme menu,
 * the cloud menu, which tells whether the user's work is backed up, and the activities under way at its left edge,
 * and the screen's own buttons, passed as children, at its right edge.
 * `AppFooter` gives it its state from the store.
 */
export function FooterBar({
  isSettingsOpen,
  onOpenSettings,
  cloudMenu,
  activities,
  onOpenActivity,
  children,
}: {
  isSettingsOpen: boolean;
  onOpenSettings: () => void;
  cloudMenu?: ReactNode;
  activities: readonly FooterActivity[];
  onOpenActivity: (activity: FooterActivity) => void;
  children?: ReactNode;
}) {
  return (
    <footer className="sticky bottom-0 border-t border-line bg-surface">
      <div className="flex items-center justify-between gap-2 px-2 py-0.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <IconButton
            label="Settings"
            aria-current={isSettingsOpen ? "page" : undefined}
            aria-disabled={isSettingsOpen || undefined}
            onClick={isSettingsOpen ? undefined : onOpenSettings}
          >
            <Settings className="size-4" />
          </IconButton>
          <ThemeMenu />
          {cloudMenu}
          <FooterActivities activities={activities} onOpen={onOpenActivity} />
        </div>
        {children && (
          <div className="flex shrink-0 items-center gap-1">{children}</div>
        )}
      </div>
    </footer>
  );
}
