import clsx from "clsx";
import { Settings } from "lucide-react";
import { useNavigationActions } from "../navigationContext.ts";
import { Button } from "./Button.tsx";
import { IconButton } from "./IconButton.tsx";
import { ThemeMenu } from "./ThemeMenu.tsx";

/**
 * Shows the way to Settings and the theme menu at the bottom of a screen.
 * `contentClassName` lets it line up with the screen's content. `settingsControl` chooses between a Settings link
 * and a gear icon, which the media screen uses to keep the footer low. `compact` halves the footer's height.
 */
export function AppFooter({
  contentClassName,
  showSettingsLink = true,
  settingsControl = "link",
  compact = false,
}: {
  contentClassName?: string;
  showSettingsLink?: boolean;
  settingsControl?: "link" | "icon";
  compact?: boolean;
}) {
  const { openSettings } = useNavigationActions();
  return (
    <footer className="border-t border-line">
      <div
        className={clsx(
          "flex items-center justify-end gap-4 px-4",
          compact ? "py-1" : "py-3",
          contentClassName,
        )}
      >
        {showSettingsLink &&
          (settingsControl === "icon" ? (
            <IconButton label="Settings" onClick={openSettings}>
              <Settings className="size-4" />
            </IconButton>
          ) : (
            <Button variant="subtle" onClick={openSettings}>
              Settings
            </Button>
          ))}
        <ThemeMenu />
      </div>
    </footer>
  );
}
