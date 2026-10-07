import clsx from "clsx";
import { Settings } from "lucide-react";
import {
  useIsSettingsOpen,
  useNavigationActions,
} from "../navigationContext.ts";
import { Button } from "./Button.tsx";
import { IconButton } from "./IconButton.tsx";
import { ThemeMenu } from "./ThemeMenu.tsx";

/**
 * A thin bar that stays at the bottom of the window, with the way to Settings and the theme menu.
 * While Settings is open, its control stands for the page already open and does nothing.
 * `contentClassName` lets it line up with the screen's content. `settingsControl` chooses between a Settings link
 * and a gear icon, which the media screen uses.
 */
export function AppFooter({
  contentClassName,
  settingsControl = "link",
}: {
  contentClassName?: string;
  settingsControl?: "link" | "icon";
}) {
  const { openSettings } = useNavigationActions();
  const isSettingsOpen = useIsSettingsOpen();
  const current = isSettingsOpen ? ("page" as const) : undefined;
  return (
    <footer className="sticky bottom-0 border-t border-line bg-surface">
      <div
        className={clsx(
          "flex items-center justify-end gap-2 px-4 py-0.5",
          contentClassName,
        )}
      >
        {settingsControl === "icon" ? (
          <IconButton
            label="Settings"
            aria-current={current}
            aria-disabled={isSettingsOpen || undefined}
            onClick={isSettingsOpen ? undefined : openSettings}
          >
            <Settings className="size-4" />
          </IconButton>
        ) : (
          <Button
            variant="subtle"
            size="sm"
            aria-current={current}
            aria-disabled={isSettingsOpen || undefined}
            onClick={isSettingsOpen ? undefined : openSettings}
          >
            Settings
          </Button>
        )}
        <ThemeMenu />
      </div>
    </footer>
  );
}
